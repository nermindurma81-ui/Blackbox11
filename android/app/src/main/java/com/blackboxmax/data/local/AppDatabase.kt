package com.blackboxmax.data.local

import androidx.room.Database
import androidx.room.RoomDatabase

@Database(entities = [IdeaEntity::class], version = 1, exportSchema = true)
abstract class AppDatabase : RoomDatabase() {
    abstract fun ideasDao(): IdeasDao
}
