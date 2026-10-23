package com.athleticaos.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@Slf4j
public class AccountMailConfig {

    /**
     * Dedicated executor for asynchronous account emails (e.g. forgot-password resets)
     * so that SMTP latency does not introduce a timing oracle on public endpoints.
     * Bounded queue with CallerRuns strictly disabled to prevent request thread fallback.
     */
    @Bean(name = "accountMailExecutor")
    public Executor accountMailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("account-mail-");
        // CallerRuns NOT allowed — drop with a WARN when the queue is full
        executor.setRejectedExecutionHandler((runnable, exec) ->
                log.warn("accountMailExecutor queue full; dropping account email task")
        );
        executor.initialize();
        return executor;
    }
}
