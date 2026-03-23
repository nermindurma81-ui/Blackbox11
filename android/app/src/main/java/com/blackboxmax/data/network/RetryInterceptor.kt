package com.blackboxmax.data.network

import okhttp3.Interceptor
import okhttp3.Response

class RetryInterceptor(private val maxRetry: Int = 2) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        var attempt = 0
        var response: Response
        var request = chain.request()
        while (true) {
            response = chain.proceed(request)
            if (response.isSuccessful || attempt >= maxRetry) return response
            if (response.code !in listOf(408, 429, 500, 502, 503, 504)) return response
            response.close()
            attempt++
            Thread.sleep(400L * attempt)
        }
    }
}
