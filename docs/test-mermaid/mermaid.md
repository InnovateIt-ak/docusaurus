---
hide_table_of_contents: true
---
# Rapid Alert System Notification ER Diagram

```mermaid
erDiagram
    
    sms {
        bigint id PK "AUTO_INCREMENT"
        int space_id FK
        int user_id FK
        string notifiable "NOT NULL"
        bigint notifiable_id 
        bigint created_by_id FK
        string phone_number "NOT NULL"
        string body "NOT NULL"
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
        timestamp updated_at "DEFAULT CURRENT_TIMESTAMP"
        string status "sent|pending"
    }

    emails {
        bigint id PK "AUTO_INCREMENT"
        int space_id FK
        int user_id FK
        string notifiable "NOT NULL"
        bigint notifiable_id
        bigint created_by_id FK
        string recipient_address "NOT NULL"
        text message
        string subject
%%      attachment?
        string status "NOT NULL"
        int importance
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
        timestamp updated_at "DEFAULT CURRENT_TIMESTAMP"
    }
    
    news_letters {
        bigint id PK "AUTO_INCREMENT"
        int space_id FK
        int user_id FK
        string notifiable "NOT NULL"
        bigint notifiable_id
        bigint created_by_id FK
        varchar recipient_address "NOT NULL"
        text message
    %%      attachment?
        string status "NOT NULL"
        int importance
        timestamp created_at "DEFAULT CURRENT_TIMESTAMP"
        timestamp updated_at "DEFAULT CURRENT_TIMESTAMP"
    }

    sms }o--|| users: belong
    emails }o--|| users: belong
    newsLetters }o--|| users: belong
    sms }o--|| spaces: belong
    emails }o--|| spaces: belong
    newsLetters }o--|| spaces: belong
````
