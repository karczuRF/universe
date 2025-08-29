use sqlx::SqlitePool;
use std::sync::Arc;

use crate::database::models::*;
use crate::tapplets::error::{
    DatabaseError::*,
    Error::{self, DatabaseError},
};

#[derive(Clone)]
pub struct DatabaseConnection(pub Arc<SqlitePool>);

#[derive(Clone)]
pub struct SqliteStore {
    pool: Arc<SqlitePool>,
}

impl SqliteStore {
    pub fn new(pool: Arc<SqlitePool>) -> Self {
        Self { pool }
    }

    pub fn get_pool(&self) -> &SqlitePool {
        &self.pool
    }

    // --- DevTapplet ---
    pub async fn get_all_dev_tapplets(&self) -> Result<Vec<DevTapplet>, Error> {
        sqlx::query_as::<_, DevTapplet>(
            "SELECT id, package_name, source, display_name, csp, tari_permissions FROM dev_tapplet",
        )
        .fetch_all(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToRetrieveData {
                entity_name: "dev_tapplet table".to_string(),
            })
        })
    }

    pub async fn get_dev_tapplet_by_id(&self, dev_tapplet_id: i32) -> Result<DevTapplet, Error> {
        sqlx::query_as::<_, DevTapplet>(
            "SELECT id, package_name, source, display_name, csp, tari_permissions FROM dev_tapplet WHERE id = ?"
        )
        .bind(dev_tapplet_id)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| DatabaseError(FailedToRetrieveData {
            entity_name: "Dev Tapplet".to_string(),
        }))
    }

    pub async fn create_dev_tapplet(&self, item: &CreateDevTapplet) -> Result<DevTapplet, Error> {
        sqlx::query_as::<_, DevTapplet>(
            r#"
            INSERT INTO dev_tapplet (package_name, source, display_name, csp, tari_permissions)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id, package_name, source, display_name, csp, tari_permissions
            "#,
        )
        .bind(&item.package_name)
        .bind(&item.source)
        .bind(&item.display_name)
        .bind(&item.csp)
        .bind(&item.tari_permissions)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToCreate {
                entity_name: item.display_name.clone(),
            })
        })
    }

    pub async fn update_dev_tapplet(&self, id: i32, item: &UpdateDevTapplet) -> Result<u64, Error> {
        let result = sqlx::query(
            r#"
            UPDATE dev_tapplet SET
                package_name = ?,
                source = ?,
                display_name = ?,
                csp = ?,
                tari_permissions = ?
            WHERE id = ?
            "#,
        )
        .bind(&item.package_name)
        .bind(&item.source)
        .bind(&item.display_name)
        .bind(&item.csp)
        .bind(&item.tari_permissions)
        .bind(id)
        .execute(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToUpdate {
                entity_name: item.display_name.clone(),
            })
        })?;
        Ok(result.rows_affected())
    }

    pub async fn delete_dev_tapplet(&self, id: i32) -> Result<u64, Error> {
        let result = sqlx::query("DELETE FROM dev_tapplet WHERE id = ?")
            .bind(id)
            .execute(self.get_pool())
            .await
            .map_err(|_| {
                DatabaseError(FailedToDelete {
                    entity_name: "Dev Tapplet".to_string(),
                })
            })?;
        Ok(result.rows_affected())
    }

    // --- Tapplet ---
    pub async fn get_all_tapplets(&self) -> Result<Vec<Tapplet>, Error> {
        sqlx::query_as::<_, Tapplet>(
            "SELECT id, tapp_registry_id, display_name, logo_url, background_url, author_name, author_website, about_summary, about_description, category FROM tapplet"
        )
        .fetch_all(self.get_pool())
        .await
        .map_err(|_| DatabaseError(FailedToRetrieveData {
            entity_name: "Tapplet".to_string(),
        }))
    }

    pub async fn get_tapplet_by_id(&self, tapplet_id: i32) -> Result<Tapplet, Error> {
        sqlx::query_as::<_, Tapplet>(
            "SELECT id, tapp_registry_id, display_name, logo_url, background_url, author_name, author_website, about_summary, about_description, category FROM tapplet WHERE id = ?"
        )
        .bind(tapplet_id)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| DatabaseError(FailedToRetrieveData {
            entity_name: "Tapplet".to_string(),
        }))
    }

    pub async fn create_tapplet(&self, item: &CreateTapplet) -> Result<Tapplet, Error> {
        sqlx::query_as::<_, Tapplet>(
            r#"
            INSERT INTO tapplet (tapp_registry_id, display_name, logo_url, background_url, author_name, author_website, about_summary, about_description, category)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING id, tapp_registry_id, display_name, logo_url, background_url, author_name, author_website, about_summary, about_description, category
            "#
        )
        .bind(&item.tapp_registry_id)
        .bind(&item.display_name)
        .bind(&item.logo_url)
        .bind(&item.background_url)
        .bind(&item.author_name)
        .bind(&item.author_website)
        .bind(&item.about_summary)
        .bind(&item.about_description)
        .bind(&item.category)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| DatabaseError(FailedToCreate {
            entity_name: item.display_name.clone(),
        }))
    }

    pub async fn update_tapplet(&self, id: i32, item: &UpdateTapplet) -> Result<u64, Error> {
        let result = sqlx::query(
            r#"
            UPDATE tapplet SET
                tapp_registry_id = ?,
                display_name = ?,
                logo_url = ?,
                background_url = ?,
                author_name = ?,
                author_website = ?,
                about_summary = ?,
                about_description = ?,
                category = ?
            WHERE id = ?
            "#,
        )
        .bind(&item.tapp_registry_id)
        .bind(&item.display_name)
        .bind(&item.logo_url)
        .bind(&item.background_url)
        .bind(&item.author_name)
        .bind(&item.author_website)
        .bind(&item.about_summary)
        .bind(&item.about_description)
        .bind(&item.category)
        .bind(id)
        .execute(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToUpdate {
                entity_name: item.display_name.clone(),
            })
        })?;
        Ok(result.rows_affected())
    }

    pub async fn delete_tapplet(&self, id: i32) -> Result<u64, Error> {
        let result = sqlx::query("DELETE FROM tapplet WHERE id = ?")
            .bind(id)
            .execute(self.get_pool())
            .await
            .map_err(|_| {
                DatabaseError(FailedToDelete {
                    entity_name: "Tapplet".to_string(),
                })
            })?;
        Ok(result.rows_affected())
    }

    // --- InstalledTapplet ---
    pub async fn get_all_installed_tapplets(&self) -> Result<Vec<InstalledTapplet>, Error> {
        sqlx::query_as::<_, InstalledTapplet>(
            "SELECT id, tapplet_id, tapplet_version_id, source, csp, tari_permissions FROM installed_tapplet"
        )
        .fetch_all(self.get_pool())
        .await
        .map_err(|_| DatabaseError(FailedToRetrieveData {
            entity_name: "InstalledTapplet".to_string(),
        }))
    }

    pub async fn get_installed_tapplet_by_id(&self, id: i32) -> Result<InstalledTapplet, Error> {
        sqlx::query_as::<_, InstalledTapplet>(
            "SELECT id, tapplet_id, tapplet_version_id, source, csp, tari_permissions FROM installed_tapplet WHERE id = ?"
        )
        .bind(id)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| DatabaseError(FailedToRetrieveData {
            entity_name: "InstalledTapplet".to_string(),
        }))
    }

    pub async fn create_installed_tapplet(
        &self,
        item: &CreateInstalledTapplet,
    ) -> Result<InstalledTapplet, Error> {
        sqlx::query_as::<_, InstalledTapplet>(
            r#"
            INSERT INTO installed_tapplet (tapplet_id, tapplet_version_id, source, csp, tari_permissions)
            VALUES (?, ?, ?, ?, ?)
            RETURNING id, tapplet_id, tapplet_version_id, source, csp, tari_permissions
            "#
        )
        .bind(item.tapplet_id)
        .bind(item.tapplet_version_id)
        .bind(&item.source)
        .bind(&item.csp)
        .bind(&item.tari_permissions)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| DatabaseError(FailedToCreate {
            entity_name: "InstalledTapplet".to_string(),
        }))
    }

    pub async fn update_installed_tapplet(
        &self,
        id: i32,
        item: &UpdateInstalledTapplet,
    ) -> Result<u64, Error> {
        let result = sqlx::query(
            r#"
            UPDATE installed_tapplet SET
                tapplet_id = ?,
                tapplet_version_id = ?,
                source = ?,
                csp = ?,
                tari_permissions = ?
            WHERE id = ?
            "#,
        )
        .bind(item.tapplet_id)
        .bind(item.tapplet_version_id)
        .bind(&item.source)
        .bind(&item.csp)
        .bind(&item.tari_permissions)
        .bind(id)
        .execute(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToUpdate {
                entity_name: "InstalledTapplet".to_string(),
            })
        })?;
        Ok(result.rows_affected())
    }

    pub async fn delete_installed_tapplet(&self, id: i32) -> Result<u64, Error> {
        let result = sqlx::query("DELETE FROM installed_tapplet WHERE id = ?")
            .bind(id)
            .execute(self.get_pool())
            .await
            .map_err(|_| {
                DatabaseError(FailedToDelete {
                    entity_name: "InstalledTapplet".to_string(),
                })
            })?;
        Ok(result.rows_affected())
    }

    // --- TappletVersion ---
    pub async fn get_all_tapplet_versions(&self) -> Result<Vec<TappletVersion>, Error> {
        sqlx::query_as::<_, TappletVersion>(
            "SELECT id, tapplet_id, version, integrity, registry_url FROM tapplet_version",
        )
        .fetch_all(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToRetrieveData {
                entity_name: "TappletVersion".to_string(),
            })
        })
    }

    pub async fn get_tapplet_version_by_id(&self, id: i32) -> Result<TappletVersion, Error> {
        sqlx::query_as::<_, TappletVersion>(
            "SELECT id, tapplet_id, version, integrity, registry_url FROM tapplet_version WHERE id = ?"
        )
        .bind(id)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| DatabaseError(FailedToRetrieveData {
            entity_name: "TappletVersion".to_string(),
        }))
    }

    pub async fn create_tapplet_version(
        &self,
        item: &CreateTappletVersion,
    ) -> Result<TappletVersion, Error> {
        sqlx::query_as::<_, TappletVersion>(
            r#"
            INSERT INTO tapplet_version (tapplet_id, version, integrity, registry_url)
            VALUES (?, ?, ?, ?)
            RETURNING id, tapplet_id, version, integrity, registry_url
            "#,
        )
        .bind(item.tapplet_id)
        .bind(&item.version)
        .bind(&item.integrity)
        .bind(&item.registry_url)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToCreate {
                entity_name: "TappletVersion".to_string(),
            })
        })
    }

    pub async fn update_tapplet_version(
        &self,
        id: i32,
        item: &UpdateTappletVersion,
    ) -> Result<u64, Error> {
        let result = sqlx::query(
            r#"
            UPDATE tapplet_version SET
                tapplet_id = ?,
                version = ?,
                integrity = ?,
                registry_url = ?
            WHERE id = ?
            "#,
        )
        .bind(item.tapplet_id)
        .bind(&item.version)
        .bind(&item.integrity)
        .bind(&item.registry_url)
        .bind(id)
        .execute(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToUpdate {
                entity_name: "TappletVersion".to_string(),
            })
        })?;
        Ok(result.rows_affected())
    }

    pub async fn delete_tapplet_version(&self, id: i32) -> Result<u64, Error> {
        let result = sqlx::query("DELETE FROM tapplet_version WHERE id = ?")
            .bind(id)
            .execute(self.get_pool())
            .await
            .map_err(|_| {
                DatabaseError(FailedToDelete {
                    entity_name: "TappletVersion".to_string(),
                })
            })?;
        Ok(result.rows_affected())
    }

    // --- TappletAudit ---
    pub async fn get_all_tapplet_audits(&self) -> Result<Vec<TappletAudit>, Error> {
        sqlx::query_as::<_, TappletAudit>(
            "SELECT id, tapplet_id, auditor, report_url FROM tapplet_audit",
        )
        .fetch_all(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToRetrieveData {
                entity_name: "TappletAudit".to_string(),
            })
        })
    }

    pub async fn get_tapplet_audit_by_id(&self, id: i32) -> Result<TappletAudit, Error> {
        sqlx::query_as::<_, TappletAudit>(
            "SELECT id, tapplet_id, auditor, report_url FROM tapplet_audit WHERE id = ?",
        )
        .bind(id)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToRetrieveData {
                entity_name: "TappletAudit".to_string(),
            })
        })
    }

    pub async fn create_tapplet_audit(
        &self,
        item: &CreateTappletAudit,
    ) -> Result<TappletAudit, Error> {
        sqlx::query_as::<_, TappletAudit>(
            r#"
            INSERT INTO tapplet_audit (tapplet_id, auditor, report_url)
            VALUES (?, ?, ?)
            RETURNING id, tapplet_id, auditor, report_url
            "#,
        )
        .bind(item.tapplet_id)
        .bind(&item.auditor)
        .bind(&item.report_url)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToCreate {
                entity_name: "TappletAudit".to_string(),
            })
        })
    }

    pub async fn update_tapplet_audit(
        &self,
        id: i32,
        item: &UpdateTappletAudit,
    ) -> Result<u64, Error> {
        let result = sqlx::query(
            r#"
            UPDATE tapplet_audit SET
                tapplet_id = ?,
                auditor = ?,
                report_url = ?
            WHERE id = ?
            "#,
        )
        .bind(item.tapplet_id)
        .bind(&item.auditor)
        .bind(&item.report_url)
        .bind(id)
        .execute(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToUpdate {
                entity_name: "TappletAudit".to_string(),
            })
        })?;
        Ok(result.rows_affected())
    }

    pub async fn delete_tapplet_audit(&self, id: i32) -> Result<u64, Error> {
        let result = sqlx::query("DELETE FROM tapplet_audit WHERE id = ?")
            .bind(id)
            .execute(self.get_pool())
            .await
            .map_err(|_| {
                DatabaseError(FailedToDelete {
                    entity_name: "TappletAudit".to_string(),
                })
            })?;
        Ok(result.rows_affected())
    }

    // --- TappletAsset ---
    pub async fn get_all_tapplet_assets(&self) -> Result<Vec<TappletAsset>, Error> {
        sqlx::query_as::<_, TappletAsset>(
            "SELECT id, tapplet_id, icon_url, background_url FROM tapplet_asset",
        )
        .fetch_all(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToRetrieveData {
                entity_name: "TappletAsset".to_string(),
            })
        })
    }

    pub async fn get_tapplet_asset_by_id(&self, id: i32) -> Result<TappletAsset, Error> {
        sqlx::query_as::<_, TappletAsset>(
            "SELECT id, tapplet_id, icon_url, background_url FROM tapplet_asset WHERE id = ?",
        )
        .bind(id)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToRetrieveData {
                entity_name: "TappletAsset".to_string(),
            })
        })
    }

    pub async fn create_tapplet_asset(
        &self,
        item: &CreateTappletAsset,
    ) -> Result<TappletAsset, Error> {
        sqlx::query_as::<_, TappletAsset>(
            r#"
            INSERT INTO tapplet_asset (tapplet_id, icon_url, background_url)
            VALUES (?, ?, ?)
            RETURNING id, tapplet_id, icon_url, background_url
            "#,
        )
        .bind(item.tapplet_id)
        .bind(&item.icon_url)
        .bind(&item.background_url)
        .fetch_one(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToCreate {
                entity_name: "TappletAsset".to_string(),
            })
        })
    }

    pub async fn update_tapplet_asset(
        &self,
        id: i32,
        item: &UpdateTappletAsset,
    ) -> Result<u64, Error> {
        let result = sqlx::query(
            r#"
            UPDATE tapplet_asset SET
                tapplet_id = ?,
                icon_url = ?,
                background_url = ?
            WHERE id = ?
            "#,
        )
        .bind(item.tapplet_id)
        .bind(&item.icon_url)
        .bind(&item.background_url)
        .bind(id)
        .execute(self.get_pool())
        .await
        .map_err(|_| {
            DatabaseError(FailedToUpdate {
                entity_name: "TappletAsset".to_string(),
            })
        })?;
        Ok(result.rows_affected())
    }

    pub async fn delete_tapplet_asset(&self, id: i32) -> Result<u64, Error> {
        let result = sqlx::query("DELETE FROM tapplet_asset WHERE id = ?")
            .bind(id)
            .execute(self.get_pool())
            .await
            .map_err(|_| {
                DatabaseError(FailedToDelete {
                    entity_name: "TappletAsset".to_string(),
                })
            })?;
        Ok(result.rows_affected())
    }
}
