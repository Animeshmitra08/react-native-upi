Pod::Spec.new do |s|
  s.name           = 'ReactNativeUpi'
  s.version        = '1.0.3'
  s.summary        = 'UPI payments for React Native and Expo (Android only)'
  s.description    = 'iOS stub for expo-upi. UPI payments are only supported on Android.'
  s.author         = 'Animeshmitra08'
  s.homepage       = 'https://github.com/Animeshmitra08/react-native-upi'
  s.license        = 'MIT'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: 'https://github.com/Animeshmitra08/react-native-upi.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
