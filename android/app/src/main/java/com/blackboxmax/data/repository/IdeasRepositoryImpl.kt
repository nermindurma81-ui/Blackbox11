package com.blackboxmax.data.repository

import com.blackboxmax.data.local.IdeaEntity
import com.blackboxmax.data.local.IdeasDao
import com.blackboxmax.data.network.BlackBoxApi
import com.blackboxmax.data.network.GenerateIdeasRequest
import com.blackboxmax.domain.model.VideoIdea
import com.blackboxmax.domain.repository.IdeasRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class IdeasRepositoryImpl @Inject constructor(
    private val api: BlackBoxApi,
    private val dao: IdeasDao
) : IdeasRepository {
    override fun observeIdeas(): Flow<List<VideoIdea>> = dao.observeIdeas().map { list ->
        list.map { VideoIdea(it.id, it.title, it.niche, it.score, it.createdAt) }
    }

    override suspend fun refreshIdeas(niche: String) {
        val remote = api.getIdeas(GenerateIdeasRequest(niche = niche, count = 10)).ideas
        if (remote.isEmpty()) return
        val mapped = remote.map { IdeaEntity(it.id, it.title, it.niche, it.score, it.createdAt) }
        dao.upsertAll(mapped)
    }
}
