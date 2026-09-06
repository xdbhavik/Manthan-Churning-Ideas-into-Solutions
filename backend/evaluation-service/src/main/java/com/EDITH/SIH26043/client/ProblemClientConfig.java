package com.EDITH.SIH26043.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;

/**
 * Builds the {@link ProblemContextApi} HTTP-interface proxy against
 * problem-service. The {@code RestClient} is addressed by the upstream SERVICE ID
 * ({@code app.problem-service.base-url} → {@code http://problem-service}) and a
 * local interceptor resolves that id to a live problem-service instance through
 * the discovery-backed {@link LoadBalancerClient}.
 *
 * <p>Deliberately NO {@code @LoadBalanced RestClient.Builder} bean: Eureka's own
 * registry transport auto-wires any such bean and would then try to discover the
 * registry through the registry (circular → "No instances available for
 * eureka-server"). The interceptor stays scoped to this client instead.</p>
 *
 * <p>A short read timeout keeps evaluation from hanging when the upstream is slow;
 * connectivity failures surface as 503 via {@link ProblemContextGateway}.</p>
 */
@Configuration
public class ProblemClientConfig {

    @Bean
    public ProblemContextApi problemContextApi(
            @Value("${app.problem-service.base-url:http://problem-service}") String baseUrl,
            LoadBalancerClient loadBalancer) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(Duration.ofSeconds(2));
        requestFactory.setReadTimeout(Duration.ofSeconds(5));

        RestClient restClient = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .requestInterceptor(new DiscoveryResolvingInterceptor(loadBalancer))
                .build();

        HttpServiceProxyFactory factory = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build();
        return factory.createClient(ProblemContextApi.class);
    }

    /**
     * Rewrites the service-id host of each request URI to the host/port of a live
     * discovered instance, then delegates to the next interceptor/executor.
     */
    private static final class DiscoveryResolvingInterceptor implements ClientHttpRequestInterceptor {

        private final LoadBalancerClient loadBalancer;

        private DiscoveryResolvingInterceptor(LoadBalancerClient loadBalancer) {
            this.loadBalancer = loadBalancer;
        }

        @Override
        public ClientHttpResponse intercept(HttpRequest request, byte[] body,
                                            ClientHttpRequestExecution execution) throws IOException {
            String serviceId = request.getURI().getHost();
            ServiceInstance instance = loadBalancer.choose(serviceId);
            if (instance == null) {
                throw new IOException("No live instances available for service " + serviceId);
            }
            URI rewritten = loadBalancer.reconstructURI(instance, request.getURI());
            return execution.execute(new HttpRequest() {
                @Override
                public HttpMethod getMethod() {
                    return request.getMethod();
                }

                @Override
                public URI getURI() {
                    return rewritten;
                }

                @Override
                public HttpHeaders getHeaders() {
                    return request.getHeaders();
                }

                @Override
                public java.util.Map<String, Object> getAttributes() {
                    return request.getAttributes();
                }
            }, body);
        }
    }
}
