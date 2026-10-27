import ExpoModulesCore

public class ReactNativeUpiModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ReactNativeUpi")

    Function("hello") {
      return "Hello world! 👋"
    }

    AsyncFunction("setValueAsync") { (value: String) in
    }
  }
}
