package com.blackboxmax.domain.model

data class VideoIdea(
    val id: Long,
    val title: String,
    val niche: String,
    val score: Int,
    val createdAt: Long
)
