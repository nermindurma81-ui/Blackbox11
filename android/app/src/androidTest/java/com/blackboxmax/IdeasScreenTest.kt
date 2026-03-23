package com.blackboxmax

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import org.junit.Rule
import org.junit.Test

class IdeasScreenTest {
    @get:Rule
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun topBarVisible() {
        composeRule.onNodeWithText("BlackBox AI MAX").assertIsDisplayed()
    }
}
