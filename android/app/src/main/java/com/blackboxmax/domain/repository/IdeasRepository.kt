package com.blackboxmax.domain.repository

import com.blackboxmax.domain.model.VideoIdea
import kotlinx.coroutines.flow.Flow

interface IdeasRepository {
    fun observeIdeas(): Flow<List<VideoIdea>>
    suspend fun refreshIdeas(niche: String)
}
