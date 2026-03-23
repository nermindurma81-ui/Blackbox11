package com.blackboxmax

import com.blackboxmax.data.network.RetryInterceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.Assert.assertEquals
import org.junit.Test

class RetryInterceptorTest {
    @Test
    fun retriesOnServerError() {
        val server = MockWebServer()
        server.enqueue(MockResponse().setResponseCode(500))
        server.enqueue(MockResponse().setResponseCode(200).setBody("ok"))
        server.start()

        val client = OkHttpClient.Builder().addInterceptor(RetryInterceptor(1)).build()
        val req = Request.Builder().url(server.url("/")).build()
        val res = client.newCall(req).execute()

        assertEquals(200, res.code)
        server.shutdown()
    }
}
