use crate::models::UserStatus;
use reqwest;

pub struct UserStatusClient {
    chat_service_url: String,
    client: reqwest::Client,
}

impl UserStatusClient {
    pub fn new(chat_service_url: String) -> Self {
        Self {
            chat_service_url,
            client: reqwest::Client::new(),
        }
    }

    pub async fn is_user_online(&self, user_id: Uuid) -> Result<bool, reqwest::Error> {
        let url = format!("{}/api/users/{}/online", self.chat_service_url, user_id);
        let res: UserStatus = self.client.get(&url).send().await?.json().await?;
        Ok(res.is_online)
    }
}