package com.blackboxmax.presentation.screen

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.blackboxmax.presentation.viewmodel.IdeasViewModel

@Composable
fun SettingsScreen(onBack: () -> Unit, vm: IdeasViewModel = hiltViewModel()) {
    val (email, setEmail) = remember { mutableStateOf("nermindurma81@gmail.com") }
    val (password, setPassword) = remember { mutableStateOf("mojnerman") }

    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text("Admin Setup")
        OutlinedTextField(value = email, onValueChange = setEmail, label = { Text("Owner email") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(value = password, onValueChange = setPassword, label = { Text("Owner password") }, modifier = Modifier.fillMaxWidth())
        Button(onClick = { vm.saveOwner(email, password) }, modifier = Modifier.fillMaxWidth()) { Text("Save secure") }
        Button(onClick = onBack, modifier = Modifier.fillMaxWidth()) { Text("Back") }
    }
}
