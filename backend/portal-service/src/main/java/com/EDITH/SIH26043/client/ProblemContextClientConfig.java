package com.EDITH.SIH26043.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.time.Duration;

@Configuration
public class ProblemContextClientConfig {
    @Bean
    public ProblemContextApi problemContextApi(
            @Value("${app.problem-service.base-url:http://problem-service}") String baseUrl,
            LoadBalancerClient loadBalancer) {
        var restClient = DiscoveryRestClientFactory.create(baseUrl, loadBalancer,
                Duration.ofSeconds(2), Duration.ofSeconds(5));
        return HttpServiceProxyFactory.builderFor(RestClientAdapter.create(restClient))
                .build().createClient(ProblemContextApi.class);
    }
}
