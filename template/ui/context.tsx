// @ts-nocheck
import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Platform, Alert } from 'react-native';
import { AlertButton, AlertState } from './types';

// Context type definition
interface AlertContextType {
  showAlert: (title: string, message?: string, buttons?: AlertButton[]) => void;
}

// Create Context
const AlertContext = createContext<AlertContextType | undefined>(undefined);

// AlertProvider - unified platform handling
interface AlertProviderProps {
  children: ReactNode;
}

export function AlertProvider({ children }: AlertProviderProps) {
  const autoDismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [alertState, setAlertState] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
    buttons: [],
    autoDismissMs: null,
  });

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[]
  ) => {
    // Parameter normalization
    const normalizedMessage = message || '';

    if (Platform.OS === 'web') {
      const shouldAutoDismiss = !buttons || buttons.length === 0;
      const normalizedButtons = buttons?.length ? buttons : [];
      setAlertState({
        visible: true,
        title,
        message: normalizedMessage,
        buttons: normalizedButtons,
        autoDismissMs: shouldAutoDismiss ? 2200 : null,
      });
    } else {
      const normalizedButtons = buttons?.length ? buttons : [{
        text: 'OK',
        onPress: () => {},
      }];
      // Mobile: Use native Alert.alert
      const alertButtons = normalizedButtons.map(button => ({
        text: button.text,
        onPress: button.onPress,
        style: button.style
      }));
      
      Alert.alert(title, normalizedMessage, alertButtons);
    }
  };

  const hideAlert = () => {
    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }
    setAlertState(prev => ({ ...prev, visible: false }));
  };

  const handleButtonPress = (button: AlertButton) => {
    try {
      
      if (typeof button.onPress === 'function') {
        button.onPress();
      }
      
      hideAlert();
    } catch (error) {
      console.warn('[Template:AlertProvider] Button press error:', error);
      hideAlert();
    }
  };

  const contextValue: AlertContextType = {
    showAlert
  };

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!alertState.visible || !alertState.autoDismissMs) return;

    if (autoDismissTimerRef.current) {
      clearTimeout(autoDismissTimerRef.current);
      autoDismissTimerRef.current = null;
    }

    autoDismissTimerRef.current = setTimeout(() => {
      setAlertState((prev) => ({ ...prev, visible: false, autoDismissMs: null }));
      autoDismissTimerRef.current = null;
    }, alertState.autoDismissMs);

    return () => {
      if (autoDismissTimerRef.current) {
        clearTimeout(autoDismissTimerRef.current);
        autoDismissTimerRef.current = null;
      }
    };
  }, [alertState.autoDismissMs, alertState.visible]);

  return (
    <AlertContext.Provider value={contextValue}>
      {children}
      {Platform.OS === 'web' && (
        <WebAlertModal
          alertState={alertState}
          onButtonPress={handleButtonPress}
          onHide={hideAlert}
        />
      )}
    </AlertContext.Provider>
  );
}

// useAlertContext Hook - internal use
export function useAlertContext(): AlertContextType {
  const context = useContext(AlertContext);
  
  if (context === undefined) {
    throw new Error('useAlertContext must be used within an AlertProvider');
  }
  
  return context;
}

// Internal Web Alert Modal Component
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface WebAlertModalProps {
  alertState: AlertState;
  onButtonPress: (button: AlertButton) => void;
  onHide: () => void;
}

function WebAlertModal({ alertState, onButtonPress, onHide }: WebAlertModalProps) {
  if (!alertState.visible) {
    return null;
  }

  // Determine button style
  const getButtonStyle = (button: AlertButton, index: number) => {
    const isLast = index === alertState.buttons.length - 1;
    const baseStyle = [styles.button];
    
    if (alertState.buttons.length > 1 && !isLast) {
      baseStyle.push(styles.buttonWithBorder);
    }
    
    return baseStyle;
  };

  // Determine button text style
  const getButtonTextStyle = (button: AlertButton) => {
    switch (button.style) {
      case 'cancel':
        return styles.cancelButtonText;
      case 'destructive':
        return styles.destructiveButtonText;
      default:
        return styles.defaultButtonText;
    }
  };

  return (
    <Modal visible={alertState.visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>{alertState.title}</Text>
            {alertState.message ? (
              <Text style={styles.message}>{alertState.message}</Text>
            ) : null}
          </View>
          
          {alertState.buttons.length > 0 ? (
            <View style={styles.buttonContainer}>
              {alertState.buttons.length === 1 ? (
              // Single button layout
              <TouchableOpacity 
                style={[styles.button, styles.singleButton]}
                onPress={() => onButtonPress(alertState.buttons[0])}
                activeOpacity={0.8}
              >
                <Text style={getButtonTextStyle(alertState.buttons[0])}>
                  {alertState.buttons[0].text}
                </Text>
              </TouchableOpacity>
              ) : (
              // Multiple button layout (horizontal)
              <View style={styles.multiButtonContainer}>
                {alertState.buttons.map((button, index) => (
                  <TouchableOpacity
                    key={index}
                    style={getButtonStyle(button, index)}
                    onPress={() => onButtonPress(button)}
                    activeOpacity={0.8}
                  >
                    <Text style={getButtonTextStyle(button)}>
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              )}
            </View>
          ) : (
            <View style={styles.autoDismissFooter}>
              <Text style={styles.autoDismissText}>This message will disappear automatically.</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: Platform.OS === 'ios' ? 14 : 12,
    minWidth: 280,
    maxWidth: 420,
    // iOS style shadow
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    color: '#1D1D1F',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: Platform.OS === 'ios' ? -0.24 : 0,
  },
  message: {
    fontSize: 15,
    color: '#86868B',
    textAlign: 'center',
    lineHeight: 20,
    letterSpacing: Platform.OS === 'ios' ? -0.24 : 0,
  },
  buttonContainer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D1D6',
  },
  autoDismissFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#D1D1D6',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  autoDismissText: {
    fontSize: 13,
    color: '#86868B',
    textAlign: 'center',
  },
  multiButtonContainer: {
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    flex: 1,
    backgroundColor: 'transparent',
  },
  singleButton: {
    flex: 0,
    width: '100%',
  },
  buttonWithBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#D1D1D6',
  },
  defaultButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    letterSpacing: Platform.OS === 'ios' ? -0.24 : 0,
  },
  cancelButtonText: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: Platform.OS === 'ios' ? '400' : '400',
    letterSpacing: Platform.OS === 'ios' ? -0.24 : 0,
  },
  destructiveButtonText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: Platform.OS === 'ios' ? '600' : '500',
    letterSpacing: Platform.OS === 'ios' ? -0.24 : 0,
  },
});
