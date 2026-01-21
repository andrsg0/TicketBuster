"""
Configuration module for Order Worker.
Uses pydantic-settings for type-safe environment variable parsing.
"""
import os
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # Database Configuration
    db_host: str = Field(default="localhost", alias="DB_HOST")
    db_port: int = Field(default=15433, alias="DB_PORT")
    db_name: str = Field(default="ticketbuster", alias="DB_NAME")
    db_user: str = Field(default="admin", alias="DB_USER")
    db_password: str = Field(default="admin", alias="DB_PASSWORD")
    db_schema: str = Field(default="db_orders", alias="DB_SCHEMA")
    
    # RabbitMQ Configuration
    rabbitmq_host: str = Field(default="localhost", alias="RABBITMQ_HOST")
    rabbitmq_port: int = Field(default=5672, alias="RABBITMQ_PORT")
    rabbitmq_user: str = Field(default="guest", alias="RABBITMQ_USER")
    rabbitmq_password: str = Field(default="guest", alias="RABBITMQ_PASSWORD")
    rabbitmq_vhost: str = Field(default="/", alias="RABBITMQ_VHOST")
    
    # Queue Names
    orders_queue: str = Field(default="orders_queue", alias="ORDERS_QUEUE")
    notifications_queue: str = Field(default="notifications_queue", alias="NOTIFICATIONS_QUEUE")
    
    # gRPC Configuration (Catalog Service)
    grpc_catalog_host: str = Field(default="localhost", alias="GRPC_CATALOG_HOST")
    grpc_catalog_port: int = Field(default=50051, alias="GRPC_CATALOG_PORT")
    
    # Worker Configuration
    prefetch_count: int = Field(default=1, alias="PREFETCH_COUNT")
    worker_name: str = Field(default="order-worker-1", alias="WORKER_NAME")
    
    # Logging
    log_level: str = Field(default="INFO", alias="LOG_LEVEL")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"
    
    @property
    def database_url(self) -> str:
        """Construct PostgreSQL connection URL."""
        return f"postgresql://{self.db_user}:{self.db_password}@{self.db_host}:{self.db_port}/{self.db_name}"
    
    @property
    def rabbitmq_url(self) -> str:
        """Construct RabbitMQ connection URL."""
        return f"amqp://{self.rabbitmq_user}:{self.rabbitmq_password}@{self.rabbitmq_host}:{self.rabbitmq_port}/{self.rabbitmq_vhost}"
    
    @property
    def grpc_catalog_address(self) -> str:
        """Construct gRPC address for catalog service."""
        return f"{self.grpc_catalog_host}:{self.grpc_catalog_port}"


# Global settings instance
settings = Settings()
