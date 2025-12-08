use rdkafka::producer::FutureProducer;
use std::sync::Arc;

pub mod producer;
pub mod consumer;

#[derive(Clone)]
pub struct Kafka {
    pub producer: Arc<FutureProducer>,
}