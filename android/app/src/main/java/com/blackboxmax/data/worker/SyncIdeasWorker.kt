package com.blackboxmax.data.worker

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.blackboxmax.domain.usecase.RefreshIdeasUseCase
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class SyncIdeasWorker @AssistedInject constructor(
    @Assisted appContext: Context,
    @Assisted params: WorkerParameters,
    private val refreshIdeasUseCase: RefreshIdeasUseCase
) : CoroutineWorker(appContext, params) {
    override suspend fun doWork(): Result = runCatching {
        val niche = inputData.getString("niche") ?: "AI Tools"
        refreshIdeasUseCase(niche)
        Result.success()
    }.getOrElse { Result.retry() }
}
