package com.blackboxmax.domain.usecase

import com.blackboxmax.domain.repository.IdeasRepository
import javax.inject.Inject

class GetIdeasUseCase @Inject constructor(
    private val repository: IdeasRepository
) {
    operator fun invoke() = repository.observeIdeas()
}
