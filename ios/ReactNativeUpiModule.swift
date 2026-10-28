import ExpoModulesCore

/*
 * UPI intents only exist on Android. On iOS this module matches
 * the web behaviour: no UPI apps are reported and pay() rejects.
 */
public class ReactNativeUpiModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReactNativeUpi")

    Function("getInstalledUpiApps") { () -> [[String: String]] in
      return []
    }

    Function("isUpiAppInstalled") { (_: String) -> Bool in
      return false
    }

    Function("buildUpiUri") { (_: [String: Any]) -> String in
      throw UpiNotSupportedException()
    }

    AsyncFunction("pay") { (_: [String: Any], promise: Promise) in
      promise.reject(UpiNotSupportedException())
    }
  }
}

internal final class UpiNotSupportedException: Exception {
  override var code: String {
    "NOT_SUPPORTED"
  }

  override var reason: String {
    "UPI payments are only supported on Android"
  }
}
