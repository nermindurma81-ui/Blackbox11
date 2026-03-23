package com.blackboxmax.domain.usecase

import com.blackboxmax.domain.repository.IdeasRepository
import javax.inject.Inject

class RefreshIdeasUseCase @Inject constructor(
    private val repository: IdeasRepository
) {
    suspend operator fun invoke(niche: String) = repository.refreshIdeas(niche)
}
