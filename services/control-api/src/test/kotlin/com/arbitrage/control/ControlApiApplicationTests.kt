package com.arbitrage.control

import org.junit.jupiter.api.Test
import org.springframework.boot.test.context.SpringBootTest

@SpringBootTest(
    properties = [
        "DATABASE_URL=jdbc:postgresql://localhost:5432/arbitrage-test",
        "POSTGRES_USER=test",
        "POSTGRES_PASSWORD=test",
    ],
)
class ControlApiApplicationTests {
    @Test
    fun contextLoads() = Unit
}
