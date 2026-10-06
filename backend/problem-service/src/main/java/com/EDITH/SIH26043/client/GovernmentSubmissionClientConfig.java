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
import org.springframework.web.client.RestClient;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;

@Configuration
public class GovernmentSubmissionClientConfig {
    @Bean
    GovernmentSubmissionApi governmentSubmissionApi(
            @Value("${app.evaluation-service.base-url:http://evaluation-service}") String baseUrl,
            LoadBalancerClient loadBalancer) {
        var factory = new org.springframework.http.client.SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(2));
        factory.setReadTimeout(Duration.ofSeconds(8));
        RestClient client = RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(factory)
                .requestInterceptor(new DiscoveryResolvingInterceptor(loadBalancer))
                .build();
        return HttpServiceProxyFactory.builderFor(RestClientAdapter.create(client))
                .build().createClient(GovernmentSubmissionApi.class);
    }

    /** Resolve the configured evaluation-service service ID through Eureka. */
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
                @Override public HttpMethod getMethod() { return request.getMethod(); }
                @Override public URI getURI() { return rewritten; }
                @Override public HttpHeaders getHeaders() { return request.getHeaders(); }
                @Override public java.util.Map<String, Object> getAttributes() {
                    return request.getAttributes();
                }
            }, body);
        }
    }
}
