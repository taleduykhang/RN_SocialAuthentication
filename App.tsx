/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-console */
/**
 * Copyright (c) 2016-present Invertase Limited & Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this library except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

import React, {useState, useEffect} from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  Image,
  TouchableOpacity,
  ImageStyle,
  TextStyle,
  ScrollView,
} from 'react-native';
import {appleAuth} from '@invertase/react-native-apple-authentication';
import {
  // LoginButton,
  AccessToken,
  GraphRequest,
  GraphRequestManager,
  LoginManager,
} from 'react-native-fbsdk';
import ZaloKit from 'react-native-zalo-kit';

/**
 * You'd technically persist this somewhere for later use.
 */

export default function App() {
  const [credentialStateForUser, updateCredentialStateForUser] =
    useState<any>(-1);
  let user: any = null;

  /**
   * Fetches the credential state for the current user, if any, and updates state on completion.
   */
  async function fetchAndUpdateCredentialState() {
    if (user === null) {
      updateCredentialStateForUser('N/A');
    } else {
      const credentialState = await appleAuth.getCredentialStateForUser(user);
      if (credentialState === appleAuth.State.AUTHORIZED) {
        console.log('credentialState', credentialState);
        updateCredentialStateForUser('AUTHORIZED');
      } else {
        updateCredentialStateForUser(credentialState);
      }
    }
  }

  /**
   * Starts the Sign In flow.
   */
  async function onAppleButtonPress() {
    // console.warn('Beginning Apple Authentication');

    // start a login request
    try {
      const appleAuthRequestResponse = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      setIsLogin('AP');
      console.log('appleAuthRequestResponse', appleAuthRequestResponse);

      const {
        user: newUser,
        email,
        nonce,
        identityToken,
        realUserStatus /* etc */,
      } = appleAuthRequestResponse;
      setUserProfile(appleAuthRequestResponse);
      user = newUser;

      fetchAndUpdateCredentialState().catch(error =>
        updateCredentialStateForUser(`Error: ${error.code}`),
      );

      if (identityToken) {
        // e.g. sign in with Firebase Auth using `nonce` & `identityToken`
        console.log(nonce, identityToken);
      } else {
        // no token - failed sign-in?
      }

      if (realUserStatus === appleAuth.UserStatus.LIKELY_REAL) {
        console.log("I'm a real person!");
      }

      console.warn(`Apple Authentication Completed, ${user}, ${email}`);
    } catch (error: any) {
      if (error.code === appleAuth.Error.CANCELED) {
        console.warn('User canceled Apple Sign in.');
      } else {
        console.error(error);
      }
    }
  }
  const [userName, setUserName] = useState<any>('');
  const [token, setToken] = useState<any>('');
  const [profilePic, setProfilePic] = useState<any>('');
  const [isLogin, setIsLogin] = useState<any>('');
  const getResponseInfo = (error: any, result: any) => {
    if (error) {
      //Alert for the Error
      Alert.alert('Error fetching data: ' + error.toString());
    } else {
      //response alert
      console.log(JSON.stringify(result));
      setIsLogin('FB');
      setUserName('Welcome ' + result.name);
      setToken('User Token: ' + result.id);
      setProfilePic(result.picture.data.url);
    }
  };
  const [userProfile, setUserProfile] = useState<any>('');

  const loginZL = async () => {
    try {
      const data = await ZaloKit.login(ZaloKit.Constants.AUTH_VIA_APP_OR_WEB);
      if (data) {
        setIsLogin('ZL');
        try {
          const data1 = await ZaloKit.getUserProfile();
          console.log('zalo', JSON.stringify(data1));
          setUserProfile(data1);
        } catch (error: any) {
          console.log(error.toString());
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const onLogout = () => {
    //Clear the state after logout
    setIsLogin('');
    setUserName(null);
    setToken(null);
    setProfilePic(null);
    updateCredentialStateForUser(null);
    setUserProfile(null);
  };

  useEffect(() => {
    if (!appleAuth.isSupported) {
      return;
    }

    fetchAndUpdateCredentialState().catch((error: any) =>
      updateCredentialStateForUser(`Error: ${error.code}`),
    );
  }, []);

  useEffect(() => {
    if (!appleAuth.isSupported) {
      return;
    }

    return appleAuth.onCredentialRevoked(async () => {
      console.warn('Credential Revoked');
      fetchAndUpdateCredentialState().catch(error =>
        updateCredentialStateForUser(`Error: ${error.code}`),
      );
    });
  }, []);

  if (!appleAuth.isSupported) {
    return (
      <View style={[styles.container, styles.horizontal]}>
        <Text>Apple Authentication is not supported on this device.</Text>
      </View>
    );
  }
  const loginWithFacebook = () => {
    LoginManager.logInWithPermissions(['public_profile', 'email']).then(
      function (result: any) {
        if (result.isCancelled) {
          Alert.alert('Login is cancelled.');
        } else {
          AccessToken.getCurrentAccessToken().then((data: any) => {
            console.log(data.accessToken.toString());
            const processRequest = new GraphRequest(
              '/me?fields=name,picture.type(large)',
              null,
              getResponseInfo,
            );
            // Start the graph request.
            new GraphRequestManager().addRequest(processRequest).start();
          });
          console.log(
            '==> Login success with permissions: ' +
              result.grantedPermissions.toString(),
          );
        }
      },
      function (error) {
        console.log('==> Login fail with error: ' + error);
      },
    );
  };
  const BtnLogin = ({
    onPressLogin,
    btnStyle,
    logoStyle,
    textStyle,
    buttonText,
    logo,
  }: {
    onPressLogin: () => void;
    btnStyle?: any;
    logoStyle?: ImageStyle;
    textStyle?: TextStyle;
    buttonText: string;
    logo: string;
  }) => {
    return (
      <TouchableOpacity
        style={[styles.facebookStyle, btnStyle]}
        onPress={onPressLogin}>
        <Image
          source={{
            uri: logo,
          }}
          style={[styles.imageIconStyle, logoStyle]}
        />
        <Text style={[styles.textStyle, textStyle]}>{buttonText}</Text>
      </TouchableOpacity>
    );
  };
  return (
    <View style={[styles.container, styles.horizontal]}>
      {isLogin === 'AP' ? (
        <ScrollView>
          <Text style={styles.header}>Login Apple suscess</Text>
          <View>
            <Text style={{color: 'red', fontWeight: 'bold'}}>
              identityToken:{' '}
              <Text style={styles.buttonText}>
                {userProfile?.identityToken}
              </Text>
            </Text>
          </View>
          <View>
            <Text style={{color: 'red', fontWeight: 'bold'}}>
              authorizationCode:{' '}
              <Text style={styles.buttonText}>
                {userProfile?.authorizationCode}
              </Text>
            </Text>
          </View>
        </ScrollView>
      ) : isLogin === 'FB' ? (
        <View>
          {profilePic ? (
            <Image source={{uri: profilePic}} style={styles.imageStyle} />
          ) : null}
          <Text> {userName} </Text>
          <Text> {token} </Text>
        </View>
      ) : isLogin === 'ZL' ? (
        <View style={styles.userInfo}>
          <View>
            <Image
              style={{width: 200, height: 200}}
              source={{
                uri: userProfile?.picture?.data?.url,
              }}
            />
          </View>
          <View>
            <Text>
              User ID: <Text style={styles.buttonText}>{userProfile.id}</Text>
            </Text>
          </View>
          <View>
            <Text>
              Name: <Text style={styles.buttonText}>{userProfile?.name}</Text>
            </Text>
          </View>
          <View>
            <Text>
              Phone:{' '}
              <Text style={styles.buttonText}>{userProfile?.phoneNumber}</Text>
            </Text>
          </View>
          <View>
            <Text>
              Gender:{' '}
              <Text style={styles.buttonText}>{userProfile.gender}</Text>
            </Text>
          </View>
          <View>
            <Text>
              DOB: <Text style={styles.buttonText}>{userProfile.birthday}</Text>
            </Text>
          </View>
        </View>
      ) : null}
      {isLogin === '' ? (
        <View>
          <BtnLogin
            onPressLogin={() => loginWithFacebook()}
            buttonText={'Login with Facebook'}
            logo={
              'https://www.iconsdb.com/icons/preview/white/facebook-4-xxl.png'
            }
            btnStyle={{backgroundColor: '#1877F2'}}
          />
          <BtnLogin
            onPressLogin={() => onAppleButtonPress()}
            buttonText={'Login with Apple'}
            logo={'https://www.iconsdb.com/icons/preview/white/apple-xxl.png'}
            btnStyle={{backgroundColor: '#000000'}}
          />
          <BtnLogin
            onPressLogin={() => loginZL()}
            buttonText={'Login with Zalo'}
            logo={
              'https://brandlogos.net/wp-content/uploads/2021/11/zalo-logo.png'
            }
            btnStyle={{backgroundColor: '#008BE6'}}
          />
        </View>
      ) : (
        <BtnLogin
          onPressLogin={onLogout}
          buttonText={'Logout'}
          logo={
            'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8a/OOjs_UI_icon_logOut-ltr.svg/1024px-OOjs_UI_icon_logOut-ltr.svg.png'
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  appleButton: {
    width: 300,
    height: 60,
    margin: 10,
  },
  header: {
    margin: 10,
    marginTop: 30,
    fontSize: 18,
    fontWeight: '600',
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  horizontal: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  // textStyle: {
  //   fontSize: 20,
  //   color: '#000',
  //   textAlign: 'center',
  //   padding: 10,
  // },
  imageStyle: {
    width: 200,
    height: 300,
    resizeMode: 'contain',
  },
  button: {
    backgroundColor: '#6200EE',
    borderRadius: 8,
    minWidth: 100,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: 'black',
    fontWeight: 'normal',
  },
  facebookStyle: {
    flexDirection: 'row',
    alignItems: 'center',
    // justifyContent: 'space-around',
    backgroundColor: '#485a96',
    borderWidth: 0.5,
    borderColor: '#fff',
    height: 40,
    width: 220,
    borderRadius: 5,
    margin: 5,
    position: 'relative',
    marginBottom: 0,
  },
  imageIconStyle: {
    padding: 10,
    marginLeft: 15,
    height: 25,
    width: 25,
    resizeMode: 'stretch',
    alignSelf: 'center',
  },
  textStyle: {
    color: '#fff',
    marginLeft: 20,
    marginRight: 20,
  },
  userInfo: {
    alignItems: 'center',
  },
});
