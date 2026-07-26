package com.arbitrage.control.health

import org.springframework.beans.factory.annotation.Value
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import java.time.Clock
import java.time.Instant

enum class HealthStatus {
    UP,
    DEGRADED,
    DOWN,
}

data class HealthResponse(
    val status: HealthStatus,
    val service: String,
    val version: String,
    val timestamp: Instant,
)

@RestController
@RequestMapping("/api/v1")
class HealthController(
    @param:Value("\${spring.application.version}") private val applicationVersion: String,
    private val clock: Clock,
) {
    @GetMapping("/health")
    fun health(): HealthResponse =
        HealthResponse(
            status = HealthStatus.UP,
            service = "control-api",
            version = applicationVersion,
            timestamp = clock.instant(),
        )
}
