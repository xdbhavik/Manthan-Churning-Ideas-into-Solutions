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
 * Builds the {@link PortalApi} HTTP-interface proxy against portal-service, using
 * the same discovery-resolving {@code RestClient} recipe as
 * {@link ProblemClientConfig} (service-id base URL + a local interceptor that
 * resolves the id through {@link LoadBalancerClient}). Deliberately NO
 * {@code @LoadBalanced} bean — see {@link ProblemClientConfig} for why.
 */
@Configuration
public class PortalClientConfig {

    @Bean
    public PortalApi portalApi(
            @Value("${app.portal-service.base-url:http://portal-service}") String baseUrl,
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
        return factory.createClient(PortalApi.class);
    }

    /** Rewrites the service-id host of each request URI to a live discovered instance. */
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
