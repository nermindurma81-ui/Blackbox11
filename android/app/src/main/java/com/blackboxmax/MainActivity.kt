package com.blackboxmax

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import com.blackboxmax.presentation.navigation.AppNavHost
import com.blackboxmax.presentation.theme.BlackBoxTheme
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BlackBoxTheme {
                Surface(modifier = Modifier) { AppNavHost() }
            }
        }
    }
}
