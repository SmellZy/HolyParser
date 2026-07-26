package com.arbitrage.control.health

import org.hamcrest.Matchers.matchesPattern
import org.junit.jupiter.api.Test
import org.springframework.test.web.servlet.get
import org.springframework.test.web.servlet.setup.MockMvcBuilders
import java.time.Clock
import java.time.Instant
import java.time.ZoneOffset

class HealthControllerTest {
    private val clock =
        Clock.fixed(
            Instant.parse("2026-07-25T12:00:00Z"),
            ZoneOffset.UTC,
        )
    private val mockMvc =
        MockMvcBuilders
            .standaloneSetup(HealthController("0.1.0-test", clock))
            .build()

    @Test
    fun `returns the versioned health contract`() {
        mockMvc
            .get("/api/v1/health")
            .andExpect {
                status { isOk() }
                content { contentType("application/json") }
                jsonPath("$.status") { value("UP") }
                jsonPath("$.service") { value("control-api") }
                jsonPath("$.version") { value("0.1.0-test") }
                jsonPath("$.timestamp") {
                    value(matchesPattern("^2026-07-25T12:00:00(?:\\.000)?Z$"))
                }
            }
    }
}
