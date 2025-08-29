pub mod models;
pub mod store;

use log::info;
use sqlx::{sqlite::SqlitePoolOptions, SqlitePool};

pub const LOG_TARGET: &str = "tari::universe::binary_manager";

pub async fn establish_connection(db_url: &str) -> SqlitePool {
    info!(target: LOG_TARGET, "Establishing db connection url: {:?}", db_url);
    SqlitePoolOptions::new()
        .max_connections(5)
        .connect(db_url)
        .await
        .expect("Failed to create SQLx pool")
}
