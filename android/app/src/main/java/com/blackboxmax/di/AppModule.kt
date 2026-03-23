package com.blackboxmax.di

import android.content.Context
import androidx.room.Room
import com.blackboxmax.BuildConfig
import com.blackboxmax.data.local.AppDatabase
import com.blackboxmax.data.local.IdeasDao
import com.blackboxmax.data.network.BlackBoxApi
import com.blackboxmax.data.network.RetryInterceptor
import com.blackboxmax.data.repository.IdeasRepositoryImpl
import com.blackboxmax.domain.repository.IdeasRepository
import com.squareup.moshi.Moshi
import dagger.Binds
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides @Singleton
    fun provideOkHttp(): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(HttpLoggingInterceptor().apply { level = HttpLoggingInterceptor.Level.BASIC })
        .addInterceptor(RetryInterceptor())
        .build()

    @Provides @Singleton
    fun provideApi(client: OkHttpClient): BlackBoxApi = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(client)
        .addConverterFactory(MoshiConverterFactory.create(Moshi.Builder().build()))
        .build()
        .create(BlackBoxApi::class.java)
}

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    @Provides @Singleton
    fun provideDb(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(context, AppDatabase::class.java, "blackbox.db").build()

    @Provides
    fun provideIdeasDao(db: AppDatabase): IdeasDao = db.ideasDao()
}

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {
    @Binds
    abstract fun bindIdeasRepository(impl: IdeasRepositoryImpl): IdeasRepository
}
