# Exam Call 2

The structure of this repository is the following:
  - "Client" contains the code of the REACT client implementation;
  - "Mosquitto Configuration" contains the Eclipse Mosquitto configuration file;
  - "REST APIs Design" contains the OpenAPI document describing the design of the REST APIs;
  - "Server" contains the code of the Film Manager service application;
  - "Server/json_schemas" contains the design of the JSON Schemas.

To login:
  - email password  :
  - user.dsp@polito.it  password
  - frank.stein@polito.it  password
  - karen.makise@polito.it  password
  - rene.regeay@polito.it  password
  - beatrice.golden@polito.it  password
  - arthur.pendragon@polito.it  password

Design choices made about the MQTT topics, messages, and configurations:

TOPICS:

  the MQTT topics have the following struct: {filmId}/{reviewerId}, a fine granularity has been used so the topic name keeps the most of the needed information. This implies that the schema of the MQTT message is smaller as it can be seen in 'Server/json_schemas/mqtt_review_message_schema.json'.
  This granularity has been choosen so that a client can receive only the MQTT updates of a specific review, instead receive all the update messages corelated to a film (in case of a larger granularity).
  
MESSAGES: ('Server/json_schemas/mqtt_review_message_schema.json')

  the MQTT messages follow this JSON structure: {completed,reviewDate,rating,review} where:
  
  - completed: the current status of the review (boolean)
  
  - reviewDate: the selected date for the review (string)
  
  - rating: the selected rating for the review (number)
  
  - review: the tecxtual description of the review (string)
  
  the only required field is completed, that is sent automatically to avoid empty messages (boolean is the smaller field).
  The other fields are sent only if set.
  When a message is received the client will update the review with the new information.
  
CONFIGURATIONS:

  - retention policy: is never applied in the implementation (was used in lab5). A retain policy is useless because the server will send the update data when the page is refreshed, so a connecting client will already have the updated reviews.
  
  - QoS: (only my implementation is described)
  
    -1: is implemented the most of the time. All the update messages are delivered with QOS 1 (at least once policy) to ensure MQTT messages are delivered. They are idempotent so the exactly once policy is useless.
    
    -2: is used for the subscribing and unsubscribing to public films/reviews when using the switch buttons in the GUI (requirement: clients can choose the notification of intrest). QoS could be 1 even but 2 has been choosen to ensure that a retransmitted message didn't delete the effect of a successive switch push, so making the GUI inconsistent with the broker's topics subscriptions.
    
  - Last Will: I didn't modified the last will from lab5.
