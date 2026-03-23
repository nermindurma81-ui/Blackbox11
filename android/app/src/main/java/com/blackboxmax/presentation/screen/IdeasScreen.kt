package com.blackboxmax.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.blackboxmax.presentation.viewmodel.IdeasViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun IdeasScreen(
    onOpenSettings: () -> Unit,
    vm: IdeasViewModel = hiltViewModel()
) {
    val ideas by vm.ideas.collectAsStateWithLifecycle()
    val uiState by vm.uiState.collectAsStateWithLifecycle()

    Scaffold(
        topBar = { TopAppBar(title = { Text("BlackBox AI MAX") }) }
    ) { p ->
        Column(modifier = Modifier.fillMaxSize().padding(p).padding(16.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(onClick = { vm.refresh() }) { Text("Refresh") }
                Button(onClick = onOpenSettings) { Text("Settings") }
                Button(onClick = { vm.scheduleSync() }) { Text("Auto Sync") }
            }
            LazyColumn(
                contentPadding = PaddingValues(top = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                item {
                    if (uiState.error != null) {
                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text("Greška: ${uiState.error}")
                                Button(onClick = { vm.clearError(); vm.refresh() }) { Text("Pokušaj ponovo") }
                            }
                        }
                    }
                }
                items(ideas) { idea ->
                    Card(modifier = Modifier.fillMaxWidth().semantics { contentDescription = "Idea ${idea.title}" }) {
                        Column(Modifier.padding(12.dp)) {
                            Text(idea.title, style = MaterialTheme.typography.titleMedium)
                            Text("Niche: ${idea.niche} • Score: ${idea.score}")
                        }
                    }
                }
            }
            if (uiState.isLoading) {
                Box(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                    CircularProgressIndicator(modifier = Modifier.semantics { contentDescription = "Loading indicator" })
                }
            }
        }
    }
}
