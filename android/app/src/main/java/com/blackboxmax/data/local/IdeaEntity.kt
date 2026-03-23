package com.blackboxmax.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "ideas")
data class IdeaEntity(
    @PrimaryKey val id: Long,
    val title: String,
    val niche: String,
    val score: Int,
    val createdAt: Long
)
