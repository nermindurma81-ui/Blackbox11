package com.blackboxmax.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.work.Data
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.blackboxmax.data.datastore.SettingsDataStore
import com.blackboxmax.data.worker.SyncIdeasWorker
import com.blackboxmax.domain.usecase.GetIdeasUseCase
import com.blackboxmax.domain.usecase.RefreshIdeasUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.concurrent.TimeUnit
import javax.inject.Inject

@HiltViewModel
class IdeasViewModel @Inject constructor(
    getIdeasUseCase: GetIdeasUseCase,
    private val refreshIdeasUseCase: RefreshIdeasUseCase,
    private val settingsDataStore: SettingsDataStore,
    private val workManager: WorkManager
) : ViewModel() {

    val ideas = getIdeasUseCase().stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList())
    private val _uiState = MutableStateFlow(IdeasUiState())
    val uiState = _uiState.asStateFlow()

    fun refresh(niche: String = "AI Tools") = viewModelScope.launch {
        _uiState.value = IdeasUiState(isLoading = true)
        runCatching { refreshIdeasUseCase(niche) }
            .onSuccess { _uiState.value = IdeasUiState(isLoading = false) }
            .onFailure { _uiState.value = IdeasUiState(isLoading = false, error = it.message ?: "Unknown error") }
    }

    fun saveOwner(email: String, password: String) = viewModelScope.launch {
        settingsDataStore.saveOwnerEmail(email)
        settingsDataStore.saveSensitiveKey("owner_password", password)
    }

    fun scheduleSync(niche: String = "AI Tools") {
        val request = PeriodicWorkRequestBuilder<SyncIdeasWorker>(6, TimeUnit.HOURS)
            .setInputData(Data.Builder().putString("niche", niche).build())
            .build()
        workManager.enqueueUniquePeriodicWork("sync_ideas", ExistingPeriodicWorkPolicy.UPDATE, request)
    }

    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}
