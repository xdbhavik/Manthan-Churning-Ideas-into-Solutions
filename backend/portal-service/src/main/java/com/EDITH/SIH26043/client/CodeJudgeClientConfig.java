package com.EDITH.SIH26043.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.client.loadbalancer.LoadBalancerClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.support.RestClientAdapter;
import org.springframework.web.service.invoker.HttpServiceProxyFactory;

import java.time.Duration;

/**
 * Builds the {@link CodeJudgeApi} HTTP-interface proxy against codejudge-service
 * (service id {@code http://codejudge-service}); used to queue an automated
 * repository evaluation when a pinned submission is submitted.
 */
@Configuration
public class CodeJudgeClientConfig {

    @Bean
    public CodeJudgeApi codeJudgeApi(
            @Value("${app.codejudge-service.base-url:http://codejudge-service}") String baseUrl,
            LoadBalancerClient loadBalancer) {
        // Read timeout is looser than the other clients: the hand-off itself only
        // queues a job, but CodeJudge enriches the row with a problem-service
        // snapshot at intake and that fetch can legitimately take a few seconds.
        var restClient = DiscoveryRestClientFactory.create(
                baseUrl, loadBalancer,
                Duration.ofSeconds(2), Duration.ofSeconds(10));

        HttpServiceProxyFactory factory = HttpServiceProxyFactory
                .builderFor(RestClientAdapter.create(restClient))
                .build();
        return factory.createClient(CodeJudgeApi.class);
    }
}
