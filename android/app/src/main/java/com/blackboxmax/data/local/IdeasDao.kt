package com.blackboxmax.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Dao
interface IdeasDao {
    @Query("SELECT * FROM ideas ORDER BY createdAt DESC")
    fun observeIdeas(): Flow<List<IdeaEntity>>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertAll(items: List<IdeaEntity>)

    @Query("DELETE FROM ideas")
    suspend fun clear()
}
