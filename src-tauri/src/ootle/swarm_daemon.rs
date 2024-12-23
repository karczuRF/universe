use log::{info, warn};
use tari_swarm_daemon::run_tari_swarm_daemon;
const LOG_TARGET: &str = "tari::dan::wallet_daemon";

pub async fn start_swarm_daemon() -> Result<(), anyhow::Error> {
    info!(target: LOG_TARGET, "🚀 Init process swarm daemon");
    tokio::spawn(async move {
        match run_tari_swarm_daemon().await {
            Ok(_) => {
                info!(target: LOG_TARGET, "🚀 Running swarm daemon");
                return Ok(());
            }
            Err(e) => {
                warn!(target: LOG_TARGET, "Error running swarm daemon: {}", e);
                return Err(e);
            }
        }
    });
    Ok(())
}
