package com.blackboxmax.data.network.dto

import com.squareup.moshi.JsonClass

@JsonClass(generateAdapter = true)
data class IdeaDto(
    val id: Long,
    val title: String,
    val niche: String,
    val score: Int,
    val createdAt: Long
)

@JsonClass(generateAdapter = true)
data class IdeasResponse(
    val ideas: List<IdeaDto> = emptyList()
)
