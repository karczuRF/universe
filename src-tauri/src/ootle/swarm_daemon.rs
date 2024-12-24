use std::{net::SocketAddr, path::PathBuf};

use log::{info, warn};
use tari_common_dan2::configuration::Network;
use tari_swarm_daemon::{
    cli::{Cli, Commands, CommonCli, Overrides},
    config::{Config, ProcessesConfig, WebserverConfig},
    run_tari_swarm_daemon,
};
const LOG_TARGET: &str = "tari::dan::wallet_daemon";

pub async fn start_swarm_daemon(
    data_dir_path: PathBuf,
    swarm_daemon_config_file: PathBuf,
) -> Result<(), anyhow::Error> {
    info!(target: LOG_TARGET, "🚀 Init process swarm daemon");
    let network = Network::get_current_or_user_setting_or_default();

    let common = CommonCli {
        base_dir: Some(data_dir_path.clone()), // Set as needed
        config_path: swarm_daemon_config_file, // Example path
        network: Some(network),                // Set as needed
    };
    let overrides = Overrides {
        webui_listen_address: Some("127.0.0.1:18000".parse::<SocketAddr>()?), // Example address
        no_compile: false,
        binaries_root: None,
        start_port: Some(18000),
        skip_registration: false,
        disable_template_auto_register: false,
    };
    let command_init = Commands::Init({
        tari_swarm_daemon::cli::InitArgs {
            force: false,
            overrides: overrides.clone(),
        }
    });
    info!(target: LOG_TARGET, "🚀 Try init cli");
    let cli = Cli::new(common.clone(), command_init);
    // TODO to start swarm run:
    // let command_start = Commands::Start(overrides);
    // let cli = Cli::new(common, command_start);

    // TODO config and/or overrides not correct
    // swarm_daemon starts but wallet daemon can't connect
    let mut swarm_config = Config {
        base_dir: data_dir_path,
        start_port: 18000,
        network,
        webserver: WebserverConfig {
            bind_address: "127.0.0.1:8080".parse::<SocketAddr>()?,
        },
        processes: ProcessesConfig {
            force_compile: false,
            instances: vec![],
            executables: vec![],
        },
        skip_registration: true,
        auto_register_previous_templates: true,
    };

    tokio::spawn(async move {
        match run_tari_swarm_daemon(&cli, Some(&mut swarm_config)).await {
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
