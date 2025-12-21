use crate::models::Message;

pub struct EmailService {
    smtp_host: String,
    smtp_user: String,
    smtp_pass: String,
}

impl EmailService {
    pub fn new(smtp_host: String, smtp_user: String, smtp_pass: String) -> Self {
        Self { smtp_host, smtp_user, smtp_pass }
    }

    pub async fn send_new_message(&self, to_email: &str, message: &Message) -> Result<(), Box<dyn std::error::Error>> {
        // Пример с lettre (SMTP)
        use lettre::{Message, SmtpTransport, Transport};

        let email = Message::builder()
            .from("chat@example.com".parse()?)
            .to(to_email.parse()?)
            .subject("Новое сообщение")
            .body(format!("У вас новое сообщение: {}", message.content))?;

        let mailer = SmtpTransport::relay(&self.smtp_host)?
            .credentials(lettre::transport::smtp::authentication::Credentials::new(
                self.smtp_user.clone(),
                self.smtp_pass.clone(),
            ))
            .build();

        mailer.send(&email)?;
        Ok(())
    }
}