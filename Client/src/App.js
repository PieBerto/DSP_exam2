import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './App.css';

import React, { useState, useEffect, useContext, useRef  } from 'react';
import { Container, Toast} from 'react-bootstrap/';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';

import { PrivateLayout, PublicLayout, PublicToReviewLayout, ReviewLayout, AddPrivateLayout, EditPrivateLayout,  AddPublicLayout, EditPublicLayout, EditReviewLayout, IssueLayout, DefaultLayout, NotFoundLayout, LoginLayout, LoadingLayout, OnlineLayout } from './components/PageLayout';
import { Navigation } from './components/Navigation';

import MessageContext from './messageCtx';
import API from './API';
import dayjs from 'dayjs';

const url = 'ws://localhost:5000'



var mqtt = require('mqtt')
var clientId = 'mqttjs_' + Math.random().toString(16).substr(2, 8)
var options = {
  keepalive: 30,
  clientId: clientId,
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000,
  will: {
    topic: 'WillMsg',
    payload: 'Connection Closed abnormally..!',
    qos: 0,
    retain: false
  },
  rejectUnauthorized: false
}
var host = 'ws://127.0.0.1:8080'
var client = mqtt.connect(host, options);



function App() {

  const [message, setMessage] = useState('');
  // If an error occurs, the error message will be shown in a toast.
  const handleErrors = (err) => {
    let msg = '';
    if (err.error) msg = err.error;
    else if (String(err) === "string") msg = String(err);
    else msg = "Unknown Error";
    setMessage(msg); // WARN: a more complex application requires a queue of messages. In this example only last error is shown.
  }

  return (
    <BrowserRouter>
      <MessageContext.Provider value={{ handleErrors }}>
        <Container fluid className="App">
          <Routes>
            <Route path="/*" element={<Main />} />
          </Routes>
          <Toast show={message !== ''} onClose={() => setMessage('')} delay={4000} autohide>
            <Toast.Body>{ message }</Toast.Body>
          </Toast>
        </Container>
      </MessageContext.Provider>
    </BrowserRouter>
  )
}

function Main() {

  // This state is used for displaying a LoadingLayout while we are waiting an answer from the server.
  const [loading, setLoading] = useState(true);
  // This state keeps track if the user is currently logged-in.
  const [loggedIn, setLoggedIn] = useState(false);
  // This state contains the user's info.
  const [user, setUser] = useState(null);
  // This state contains the possible selectable filters.
  const [filters, setFilters] = useState({});
  //This state contains the online list.
  const [onlineList, setOnlineList] = useState([]);
  //This state contains the film selections.
  const [filmSelections, setFilmSelections] = useState([]);

  const [subscribedTopics, setSubscribedTopics] = useState([]);

  //the mqtt msg container
  const [update, setUpdate] = useState(undefined);
  //the film subscriber list (which films the user has selected to receive review update)
  const [filmSub,setFilmSub] = useState([]);
  //the review subscriber list (which review the user has selected to receive review update)
  const [reviewSub,SetReviewSub] = useState([]);
  //allow to disable or enable the subscribing switch
  const [switchDisabled,setSwitchDisabled] = useState(true);

  // Error messages are managed at context level (like global variables)
  const {handleErrors} = useContext(MessageContext);

  const location = useLocation();

  let socket = useRef(null);

  //reverse the disabled property of the switch used to subscribe/unsubscribe to MQTT topics
  const reverseSwitchDisable = () => {
    setSwitchDisabled((old)=>!old);
  }

  //once the mqtt modifies are applied the update can be cleared
  const clearUpdate = () => {
    setUpdate(undefined);
  }

  //If a film is selected i must select all the sub-reviews, if deselected => review deselecting
  const subSelecting = (filmId,select) => {
    SetReviewSub((old)=>old.map((review)=>{
      if(Number(review.filmId) === Number(filmId)){
        return {filmId:review.filmId, reviewerId:review.reviewerId,subscribed:select}
      }
      return review;
    }))
  }

  //If a sub-review of a selected film is deselected => the film must be deselected
  const filmDeselect = (filmId)=>{
    const filmIndex = filmSub.findIndex((film)=>film.filmId === filmId && film.subscribed === true);
      if(filmIndex !== -1){
        setFilmSub((old)=>{
          const newArr = [...old];
          newArr[filmIndex].subscribed = false;
          return newArr;
      })
    }
  }

  //applies the user's choises about film's review update
  const filmReverseSub = (id) =>{
    setFilmSub((old)=>{
      const newFilms = old.map((film)=>{
        if(film.filmId === id){
          if(film.subscribed === true){
            subSelecting(id, false);
            reviewSub.forEach((review)=>{
              if(review.filmId === id && review.subscribed === true){
                client.unsubscribe(id + '/' + review.reviewerId , { qos: 2 });
              }
            })
          } else {
            subSelecting(id, true);
            reviewSub.forEach((review)=>{
              if(review.filmId === id && review.subscribed === false){
                client.subscribe(id + '/' + review.reviewerId ,{ qos: 2 });
              }
            })
          }
          return {filmId: film.filmId, subscribed: !film.subscribed};
        }
        return film;
      })
      localStorage.setItem('films',JSON.stringify(newFilms.filter((film)=>film.subscribed === true)));
      return newFilms;
  })
  }

  //applies the user's choises about review's review update
  const reviewReverseSub = (filmId, reviewerId) => {
    SetReviewSub((old)=>{
      const newReviews = old.map((review)=>{
        if(review.filmId === filmId && review.reviewerId === reviewerId){
          if(review.subscribed === true){
            filmDeselect(filmId);
            client.unsubscribe(String(filmId)+'/'+String(reviewerId), { qos: 2 });
          } else {
            client.subscribe(String(filmId)+'/'+String(reviewerId), { qos: 2 });
          }
          return {filmId: review.filmId, reviewerId: review.reviewerId, subscribed: !review.subscribed}
        }
        return review;
      })
      localStorage.setItem('reviews',JSON.stringify(newReviews.filter((review)=>review.subscribed === true)));
      return newReviews;
    })
  }
  // initializing the MQTT notification selection container

  //Websockets and MQTT management
  useEffect(() => {
    const ws = new WebSocket(url)

    ws.onopen = () => {
      ws.send('Message From Client');
    }
    
    ws.onerror = (error) => {
      console.log(`WebSocket error: ${error}`);
    }
    
    ws.onmessage = (e) => {
      try {
        messageReceived(e);
      } catch (error) {
        console.log(error);
      }
      
    }

    const messageReceived = (e) => {
      let datas = JSON.parse(e.data.toString());
      if (datas.typeMessage == "login") {
        setOnlineList(currentArray => {
          var newArray = [...currentArray];
          let flag = 0;
          for (var i = 0; i < newArray.length; i++) {
            if (newArray[i].userId == datas.userId) {
              flag = 1;
            }
          }
          if (flag == 0) {
            newArray.push(datas);
            return newArray;
          } else {
            return newArray;
          }
        });
      }
      if (datas.typeMessage == "logout") {
        setOnlineList(currentArray => {
          var newArray = [...currentArray];
          for (var i = 0; i < newArray.length; i++) {
            if (newArray[i].userId == datas.userId) {
              newArray.splice(i, 1);
            }
          }
          return newArray;
        });
      }
      if (datas.typeMessage == "update") {
        setOnlineList(currentArray => {
          let flag = 0;
          var newArray = [...currentArray];
          for (var i = 0; i < newArray.length; i++) {
            if (newArray[i].userId == datas.userId) {
              flag = 1;
              newArray[i] = datas;
              return newArray;
            }
          }
    
          if (flag == 0) 
            newArray.push(datas);
          return newArray;

        });

      }  
    }
  
    socket.current = ws;



    client.on('error', function (err) {
      console.log(err)
      client.end()
    })
    
    client.on('connect', function () {
      console.log('client connected:' + clientId);
    })


    client.on('message', (topic,message) => {
      if(!topic.includes('/')){
        try {
          var parsedMessage = JSON.parse(message);
          if(parsedMessage.status == "deleted") client.unsubscribe(topic);
          displayFilmSelection(topic, parsedMessage);
        } catch(e) {
            console.log(e);
        }
      } else {
        const array = topic.split('/');
        const filmId = Number(array[0]);
        const reviewerId = Number(array[1]);
        const parsedMessage = JSON.parse(message);
        if(parsedMessage.reviewDate){
          parsedMessage.reviewDate = dayjs(parsedMessage.reviewDate)
        }
        setUpdate({filmId:filmId,reviewerId:reviewerId,...parsedMessage});
      }
    }) 

    const displayFilmSelection = (topic, parsedMessage) => {

      setFilmSelections(currentArray => {
        var newArray = [...currentArray]
        var index = newArray.findIndex(x => x.filmId == topic);
        let objectStatus = { filmId: topic, userName: parsedMessage.userName, status: parsedMessage.status };
        index === -1 ? newArray.push(objectStatus) : newArray[index] = objectStatus;
        return newArray;
      });
      
    }

    client.on('close', function () {
      console.log(clientId + ' disconnected');
    })
},[]);

  
  /*
   * This function handles the receival of WebSocket messages.
  */
  

  useEffect(() => {
    const init = async () => {
        setLoading(true);

        // Define filters 
        const filters = ['private', 'public', 'public/to_review', 'online'];
        setFilters(filters);
        // NOTE: this method is called before getUserInfo because if not logged an exception is rised and it would be skipped

        //const user = await API.getUserInfo();  // here you have the user info, if already logged in
        if(localStorage.getItem('userId') != undefined){
          setUser(localStorage.getItem('userId'));
          setLoggedIn(true);
          setLoading(false);
        } else {
          setUser(null);
          setLoggedIn(false);
          setLoading(false);
        } 
    };
    init();
  }, []);  // This useEffect is called only the first time the component is mounted.

  const userChange = useRef(user);
  const counter = useRef(0);
  //Initializing the structs for MQTT notification! ONLY ONCE
  useEffect(()=>{
    const structInit = async ()=>{
      const publicFilms = await API.getPublicFilms(-1);
      if(localStorage.getItem('userId') != undefined){
        counter.current = counter.current+1;
        let films = localStorage.getItem('films');
        if(films && films!=="undefined"){
          films = JSON.parse(films);
          films.forEach((film) => {
            //QOS 1: is enougth at least once
            client.subscribe(String(film.filmId)+'/#', { qos: 1 });
          })
        } else {
          films = [];
        }
        let reviews = localStorage.getItem('reviews');
        if(reviews && reviews !== "undefined"){
          reviews = JSON.parse(reviews);
          reviews.forEach((review)=>{
            //QOS 1: is enougth at least once
            if(films.find((film)=>film.filmId === review.filmId) === undefined){
              client.subscribe(String(review.filmId)+'/'+String(review.reviewerId), { qos: 1 })
            }
          })
        } else {
          reviews = [];
        }
        let reviewsStruct = [];
        for(let film of publicFilms){
          try{
            const tmpReviews = await API.getFilmReviews(film.id,-1);
            tmpReviews.forEach((rev)=>{
              if(reviews.find((r)=>Number(r.filmId) === Number(rev.filmId) && Number(r.reviewerId) === Number(rev.reviewerId)) !== undefined){
                reviewsStruct = reviewsStruct.concat({filmId:rev.filmId,reviewerId:rev.reviewerId,subscribed:true})
              } else {
                reviewsStruct = reviewsStruct.concat({filmId:rev.filmId,reviewerId:rev.reviewerId,subscribed:false})
              }
            })
          } catch(e) {
            //there isn't a review for this film.
            if(!e.errors[0].msg === "The page does not exist."){
              throw e;
            }
          }
        }
        SetReviewSub(reviewsStruct);
        setFilmSub(publicFilms.map((film)=>{
          if(films.find((f)=>Number(f.filmId)===Number(film.id)) !== undefined){
            subSelecting(film.id, true);
            return {filmId:film.id, subscribed: true};
          }
          return {filmId:film.id, subscribed: false}
        }))
      }
    }
    if(user){
      if(userChange && userChange !== user){
        counter.current = 0;
      }
      userChange.current = user;
    }
    if(counter.current === 0){
      structInit();
    }
  },[user]) 

  /**
   * This function handles the login process.
   * It requires a email and a password inside a "credentials" object.
   */
  const handleLogin = async (credentials) => {
    try {
      const user = await API.logIn(credentials);
      localStorage.setItem('userId', user.id);
      localStorage.setItem('username', user.name);
      localStorage.setItem('email', user.email);
      localStorage.setItem('films',JSON.stringify(user.films));
      setUser(user);
      setLoggedIn(true);
      user.films.forEach((obj) => {
        client.subscribe(String(obj.filmId)+'/#', { qos: 1 });
      })
    } catch (err) {
      // error is handled and visualized in the login form, do not manage error, throw it
      throw err;
    }
  };

  /**
   * This function handles the logout process.
   */ 
  const handleLogout = async () => {
    if(user){
      if(user.films){
        user.films.forEach((obj) => {
          client.unsubscribe(String(obj.filmId)+'/#', {qos: 1});
        })
      }
      setLoggedIn(false);
      setUser(null);
      localStorage.removeItem('userId');
      localStorage.removeItem('username');
      localStorage.removeItem('films');
      localStorage.removeItem('reviews');
    }
    await API.logOut();
    localStorage.removeItem('email');
  };

  


  return (
    <>
      <Navigation logout={handleLogout} user={user} loggedIn={loggedIn} switchDisabled={switchDisabled} reverseSwitchDisable={reverseSwitchDisable} />

      <Routes>
        <Route path="/" element={
          loading ? <LoadingLayout />
            : loggedIn ? <DefaultLayout filters={filters} onlineList={onlineList}/>
              : <Navigate to="/login" replace state={location} />
        } >
          <Route index element={<PrivateLayout/>} />
          <Route path="private" element={<PrivateLayout/>} />
          <Route path="private/add" element={<AddPrivateLayout />} />
          <Route path="private/edit/:filmId" element={<EditPrivateLayout />} />
          <Route path="public" element={<PublicLayout filmSub={filmSub} filmReverseSub={filmReverseSub} switchDisabled={switchDisabled}/>} />
          <Route path="public/add" element={<AddPublicLayout />} />
          <Route path="public/edit/:filmId" element={<EditPublicLayout />} />
          <Route path="public/:filmId/reviews" element={<ReviewLayout update={update} clearUpdate={clearUpdate} reviewReverseSub={reviewReverseSub} reviewSub={reviewSub} switchDisabled={switchDisabled}/>} />
          <Route path="public/:filmId/reviews/complete" element={<EditReviewLayout/>} />
          <Route path="public/:filmId/issue" element={<IssueLayout/>} />
          <Route path="public/to_review" element={<PublicToReviewLayout onlineList={onlineList} filmSelections={filmSelections} client={client} subscribedTopics={subscribedTopics} setSubscribedTopics={setSubscribedTopics}/>} />
          <Route path="online" element={<OnlineLayout onlineList={onlineList}/>} />
          <Route path="*" element={<NotFoundLayout />} />
        </Route>

        <Route path="/login" element={!loggedIn ? <LoginLayout login={handleLogin}/> : <Navigate replace to='/' />} />
      </Routes>
    </>
  );
}

export default App;
