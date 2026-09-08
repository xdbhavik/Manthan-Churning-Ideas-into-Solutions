package com.EDITH.SIH26043.client;

import org.springframework.cloud.client.ServiceInstance;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpRequest;
import org.springframework.http.client.ClientHttpRequestExecution;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.http.client.ClientHttpResponse;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.URI;
import java.time.Duration;

/**
 * Builds {@link RestClient}s that resolve the upstream SERVICE ID in the base URL
 * (e.g. {@code http://source-service}) to a live instance through the
 * discovery-backed {@link LoadBalancerClient}.
 *
 * <p>Deliberately NO {@code @LoadBalanced RestClient.Builder} bean: Eureka's own
 * registry transport auto-wires any such bean and would then try to discover the
 * registry through the registry (circular → "No instances available for
 * eureka-server"). The interceptor stays scoped to the client built here.</p>
 */
final class DiscoveryRestClientFactory {

    private DiscoveryRestClientFactory() {
    }

    static RestClient create(String baseUrl, LoadBalancerClient loadBalancer,
                             Duration connectTimeout, Duration readTimeout) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout(connectTimeout);
        requestFactory.setReadTimeout(readTimeout);

        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestFactory(requestFactory)
                .requestInterceptor(new DiscoveryResolvingInterceptor(loadBalancer))
                .build();
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
