use crate::models::Message;

pub struct PushService {
    firebase_key: String,
}

impl PushService {
    pub fn new(firebase_key: String) -> Self {
        Self { firebase_key }
    }

    pub async fn send_to_user(&self, fcm_token: &str, message: &Message) -> Result<(), Box<dyn std::error::Error>> {
        let client = reqwest::Client::new();
        let payload = serde_json::json!({
            "to": fcm_token,
            "notification": {
                "title": "Новое сообщение",
                "body": &message.content
            }
        });

        client
            .post("https://fcm.googleapis.com/fcm/send")
            .header("Authorization", format!("key={}", self.firebase_key))
            .header("Content-Type", "application/json")
            .json(&payload)
            .send()
            .await?;

        Ok(())
    }
}