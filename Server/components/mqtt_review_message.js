class MQTTReviewMessage {    
    constructor(completed, reviewDate, rating, review) {
        this.completed = completed;
        if(reviewDate) this.reviewDate = reviewDate;
        if(rating) this.rating = rating;
        if(review) this.review = review;

    }
}

module.exports = MQTTReviewMessage;