package com.blackboxmax.data.network

import com.blackboxmax.data.network.dto.IdeasResponse
import retrofit2.http.Body
import retrofit2.http.POST

interface BlackBoxApi {
    @POST("/api/generate/ideas")
    suspend fun getIdeas(@Body req: GenerateIdeasRequest): IdeasResponse
}

data class GenerateIdeasRequest(
    val niche: String,
    val count: Int = 10
)
