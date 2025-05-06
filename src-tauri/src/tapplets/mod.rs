use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use diesel::SqliteConnection;
use tokio_util::sync::CancellationToken;

pub mod error;
pub mod hash_calculator;
pub mod interface;
pub mod tapp_consts;
pub mod tapplet_installer;
pub mod tapplet_server;

const LOG_TARGET: &str = "tari::universe::main";

pub struct Tokens {
    pub auth: Mutex<String>,
    pub permission: Mutex<String>,
}
#[derive(Default)]
pub struct ShutdownTokens(pub Arc<tokio::sync::Mutex<HashMap<i32, CancellationToken>>>);

pub struct DatabaseConnection(pub Arc<Mutex<SqliteConnection>>);
