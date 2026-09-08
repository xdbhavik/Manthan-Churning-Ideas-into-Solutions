package com.EDITH.SIH26043.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.time.Duration;

/**
 * Builds the {@link SourceAccountsApi} HTTP-interface proxy against
 * source-service. The {@code RestClient} is addressed by the upstream SERVICE ID
 * ({@code app.source-service.base-url} → {@code http://source-service}) and the
 * shared interceptor resolves that id to a live instance through discovery.
 */
@Configuration
public class SourceAccountsClientConfig {

    @Bean
    public SourceAccountsApi sourceAccountsApi(
            @Value("${app.source-service.base-url:http://source-service}") String baseUrl,
            LoadBalancerClient loadBalancer) {
        var restClient = DiscoveryRestClientFactory.create(
                baseUrl, loadBalancer,
                Duration.ofSeconds(2), Duration.ofSeconds(5));

        HttpServiceProxyFactory factory = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build();
        return factory.createClient(SourceAccountsApi.class);
    }
}
