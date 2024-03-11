/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import firestore from '@react-native-firebase/firestore'
import React, {useEffect, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Dimensions,
  FlatList,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import messaging from '@react-native-firebase/messaging'
import auth from "@react-native-firebase/auth"
import notificationHandler from './notificationHandler';

function App(){
  

  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [firebaseToken, setFirebaseToken] = useState("")
  const [currentUser, setCurrentUser] = useState(null)
  const [users, setUsers] = useState([])
  const [isGettingConversation, setIsGettingConversation] = useState()
  const [index, setIndex] = useState(0)
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [message, setMessage] = useState("")
  const [isSendingMessage, setIsSendingMessage] = useState(false)
  const [messages, setMessages] = useState([])
  const scrollRef = useRef()
  const indexRef = useRef()

  useEffect(()=>{
    notificationHandler.setupInitialNotification()
    notificationHandler.setupOnNotificationOpenedApp()

    const unsubscribe = notificationHandler.setupOnNotificationHandler()
    return unsubscribe;

  }, [])

  useEffect(()=>{
    indexRef.current = index
  }, [index])

  const requestUserPermission = async () => {
    const authStatus = await messaging().requestPermission()
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL

    if (enabled) {
      getFirebaseToken()
    }
  }

  const getFirebaseToken = async () => {
    const firebaseToken = await messaging().getToken()
    console.log(firebaseToken)
    setFirebaseToken(firebaseToken)
  }

  useEffect(() => {
    const user = auth().currentUser
    setCurrentUser(user)
    setTimeout(()=>{
      requestUserPermission()
    },2000)
  }, [])

  useEffect(()=>{
    if(firebaseToken && currentUser){
      firestore().collection("users").where("id", "==", currentUser.uid).get().then((response)=>{
        if(response.size == 0){
        firestore().collection("users").add({id: currentUser.uid, firebase_token: firebaseToken, email: currentUser.email})
        .then((res)=>{})
        .catch((err)=>{ })
        }else{
          const id = response.docs[0].id
          firestore().collection("users").doc(id).update({firebase_token: firebaseToken})
        }
      })
      getUsers()
    }
  }, [firebaseToken, currentUser])

  useEffect(()=>{
    if(selectedConversation){
      firestore().collection("messages").where("conversation_id", "==", selectedConversation).onSnapshot((snapshot)=>{
        const data = []
        snapshot.docChanges().forEach((change)=>{
          console.log(change.type, "change")
        })
        snapshot.docs.forEach((mssg)=>{
          data.push(mssg.data())
        })
        setMessages(data)
      })
    }
  }, [selectedConversation])

  const getConversation = (userId)=>{
    if(isGettingConversation){
      return
    }
    setIsGettingConversation(userId)
    firestore().collection("conversations")
    .where(`users.${userId}`, "==", true)
    .where(`users.${currentUser.uid}`, "==", true)
    .get().then((res)=>{
      if(res.size == 0){
        firestore().collection("conversations").add({users: {[userId]: true, [currentUser.uid]: true}}).then((_res)=>{
          setSelectedConversation(_res.id)
          setIsGettingConversation(false)
          scrollToEnd()
        }).catch(()=>{})
      }else{
        setIsGettingConversation(false)
        scrollToEnd()
        setSelectedConversation(res.docs[0].id)
      }
    }).catch((err)=>{
      setIsGettingConversation(false)
    })
  }

  const getUsers = ()=>{
    firestore().collection("users").where("id", "!=", currentUser.uid).get().then((response)=>{
      const data = []
      response.forEach((_user)=>{
        data.push(_user.data())
      })
      setUsers(data)
    })
  }

  const sendMessage = ()=>{
    if(isSendingMessage){
      return
    }
    setIsSendingMessage(true)
    firestore().collection("messages").add({text: message, sender_id: currentUser.uid, conversation_id: selectedConversation})
    .then((res)=>{
      setMessage("")
      setIsSendingMessage(false)
    }).catch(()=>{
      setIsSendingMessage(false)
    })
  }

  const register = async()=>{
    if(email.trim().length==0 || password.trim().length==0){
      return
    }
    if(isLoading){
      return
    }
    setIsLoading(true)
    try{
      const response = await auth().createUserWithEmailAndPassword(email, password)
      setCurrentUser(response.user)
      Alert.alert("Success", "user has been regestered successffuly")
      setIsLoading(false)
    }catch (err){
      setIsLoading(false)
      Alert.alert("error", err.message)
    }
  }

  const goToHome = ()=>{
    scrollRef.current.scrollTo({x: 0, y: 0, animated: true});
    setIndex(0)
  }

  useEffect(()=>{
    const backHandlerAction = ()=>{
      if(indexRef.current>0){
        goToHome()
      }
      return true
    }
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backHandlerAction
    );
    return () => backHandler.remove();
  }, [])

  const scrollToEnd=()=>{ 
    // switch to subMotifs screen
    scrollRef.current.scrollToEnd()
    setIndex(1)
  }

  const deviceWidth = Dimensions.get("window").width

  return (
    <SafeAreaView 
      style={{
        flex: 1, 
        backgroundColor: "white"
      }}
    >
      <View
        style={{
          flex: 1,
          paddingTop: 20
        }}
      >
        {!currentUser ?(
        <ScrollView
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps='handled'
          contentContainerStyle={{
            justifyContent: "center", 
          }}
        >
          <TextInput
            placeholder='email'
            placeholderTextColor={"grey"}
            style={{
              color: "black", 
              borderRadius: 10, 
              borderWidth: 1, 
              borderColor: "black", 
              margin: 20, 
              marginTop: 0
            }}
            onChangeText={(v)=>setEmail(v)}
            value={email}
          />

          <TextInput
            placeholder='password'
            placeholderTextColor={"grey"}
            style={{
              color: "black", 
              borderRadius: 10, 
              borderWidth: 1, 
              borderColor: "black", 
              margin: 20, 
              marginTop: 0
            }}
            secureTextEntry={true}
            onChangeText={(v)=>setPassword(v)}
            value={password}
          />
          <TouchableOpacity
            style={{
              backgroundColor: "black", 
              margin: 20, 
              paddingVertical: 15, 
              borderRadius: 16, 
              alignItems: "center"
            }}
            onPress={register}
          >
            {isLoading ? <ActivityIndicator/>:
            <Text
              style={{
                fontSize: 16, 
                fontWeight: "700", 
                color: "white"
              }}
            >
              Register
            </Text>}
          </TouchableOpacity>
        </ScrollView>):(
          <View
            style={{
              flex: 1
            }}
          >
            <ScrollView
              ref={scrollRef}
              pagingEnabled
              horizontal
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps='handled'
            >
              <FlatList
                data={users}
                keyExtractor={(item, index) => index + item.id}
                contentContainerStyle={{
                  width: deviceWidth
                }}
                renderItem={({item})=>(
                  <TouchableOpacity
                    style={{
                      margin: 20, 
                      justifyContent: 'space-between', 
                      flexDirection: "row", 
                    }}
                    onPress={()=>getConversation(item.id)}
                  >
                    <Text
                      style={{
                        color: "black", 
                        marginEnd: 10
                      }}
                    >
                      {item.email}
                    </Text>
                    {isGettingConversation == item.id && (
                      <ActivityIndicator/>
                    )}
                  </TouchableOpacity>
                )}
              />
            <View
              style={{
                width: deviceWidth
              }}
              >
              <View
                style={{
                  width: deviceWidth,
                  flexDirection: "row"
                }}
              >
                <TextInput
                  placeholder='send a message'
                  placeholderTextColor={"grey"}
                  style={{
                    color: "black", 
                    borderRadius: 10, 
                    borderWidth: 1, 
                    borderColor: "black", 
                    margin: 20, 
                    marginTop: 0, 
                    width: deviceWidth - 150, 
                    height: 40, 
                    marginEnd: 10
                  }}
                  secureTextEntry={true}
                  onChangeText={(v)=>setMessage(v)}
                  value={message}
                />
                <TouchableOpacity
                  style={{
                    backgroundColor: "black", 
                    borderRadius: 16, 
                    alignItems: "center", 
                    justifyContent: "center",
                    height: 40, 
                    marginEnd:20,
                    flex: 1
                  }}
                  onPress={sendMessage}
                >
                  {isSendingMessage ? <ActivityIndicator/>:
                  <Text
                    style={{
                      fontSize: 16, 
                      fontWeight: "700", 
                      color: "white"
                    }}
                  >
                    Send
                  </Text>}
                </TouchableOpacity>
                </View>
                <FlatList
                  data={messages}
                  keyExtractor={(item, index) => index }
                  contentContainerStyle={{
                    width: deviceWidth, 
                  }}
                  renderItem={({item})=>(
                    <Text
                      style={{
                        color: "black", 
                        marginEnd: 10, 
                        marginHorizontal: 20, 
                        alignSelf: item.sender_id==currentUser.uid ? "flex-end": "flex-start"
                      }}
                    >
                      {item.text}
                    </Text>
                  )}
                />
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}


export default App;
