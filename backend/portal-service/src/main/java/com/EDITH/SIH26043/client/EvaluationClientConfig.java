package com.EDITH.SIH26043.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.time.Duration;

/**
 * Builds the {@link EvaluationApi} HTTP-interface proxy against evaluation-service
 * (service id {@code http://evaluation-service}); used to open a project-review
 * work item when a submission is submitted/resubmitted.
 */
@Configuration
public class EvaluationClientConfig {

    @Bean
    public EvaluationApi evaluationApi(
            @Value("${app.evaluation-service.base-url:http://evaluation-service}") String baseUrl,
            LoadBalancerClient loadBalancer) {
        // A slightly longer read timeout than the source call: opening a review
        // resolves the problem's cycle + scoring assignment on the eval side.
        var restClient = DiscoveryRestClientFactory.create(
                baseUrl, loadBalancer,
                Duration.ofSeconds(2), Duration.ofSeconds(10));

        HttpServiceProxyFactory factory = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build();
        return factory.createClient(EvaluationApi.class);
    }
}
