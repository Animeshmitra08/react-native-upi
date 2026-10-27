package expo.modules.upi

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ResolveInfo
import android.net.Uri
import android.os.Build
import android.util.Log
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.math.BigDecimal
import java.math.RoundingMode

/*
 * Options passed from JS to pay() and buildUpiUri().
 */
class PayOptions : Record {
  @Field val pa: String = ""
  @Field val pn: String = ""
  @Field val amount: String = ""

  // Package name of the UPI app to open. When null, Android's app chooser is shown.
  @Field val app: String? = null
  @Field val chooserTitle: String? = null
}

class ReactNativeUpiModule : Module() {
  /*
   * Promise and URI of the payment currently waiting for
   * the UPI app to return a result.
   */
  private var pendingPromise: Promise? = null
  private var pendingUri: String? = null

  override fun definition() = ModuleDefinition {
    Name("ReactNativeUpi")

    Function("getInstalledUpiApps") {
      queryUpiApps()
        .distinctBy { it.activityInfo.packageName }
        .map { info ->
          mapOf(
            "packageName" to info.activityInfo.packageName,
            "name" to info.loadLabel(packageManager()!!).toString()
          )
        }
    }

    Function("isUpiAppInstalled") { packageName: String ->
      queryUpiApps(packageName).isNotEmpty()
    }

    /*
     * Returns the exact URI pay() would send, without opening any app.
     */
    Function("buildUpiUri") { options: PayOptions ->
      buildUpiUri(options)
    }

    AsyncFunction("pay") { options: PayOptions, promise: Promise ->
      val activity = appContext.currentActivity

      if (activity == null) {
        promise.reject("NO_ACTIVITY", "No active Android activity found", null)
        return@AsyncFunction
      }

      /*
       * Prevent two payments from being started
       * at the same time.
       */
      if (pendingPromise != null) {
        promise.reject("PAYMENT_IN_PROGRESS", "Another payment is already in progress", null)
        return@AsyncFunction
      }

      val uri = try {
        buildUpiUri(options)
      } catch (exception: CodedException) {
        promise.reject(exception)
        return@AsyncFunction
      }

      Log.d(TAG, "Launching UPI intent: $uri")

      val upiIntent = Intent(Intent.ACTION_VIEW, Uri.parse(uri))

      val launchIntent = if (options.app.isNullOrBlank()) {
        if (queryUpiApps().isEmpty()) {
          promise.reject("NO_UPI_APP", "No UPI app is installed on this device", null)
          return@AsyncFunction
        }
        Intent.createChooser(upiIntent, options.chooserTitle ?: "Pay with")
      } else {
        if (queryUpiApps(options.app).isEmpty()) {
          promise.reject("UPI_APP_NOT_INSTALLED", "${options.app} is not installed or does not support UPI payments", null)
          return@AsyncFunction
        }
        upiIntent.setPackage(options.app)
      }

      try {
        pendingPromise = promise
        pendingUri = uri
        activity.startActivityForResult(launchIntent, UPI_REQUEST_CODE)
      } catch (exception: Exception) {
        pendingPromise = null
        pendingUri = null
        promise.reject(
          "PAYMENT_START_FAILED",
          exception.message ?: "Unable to start the UPI app",
          exception
        )
      }
    }.runOnQueue(Queues.MAIN)

    OnActivityResult { _, payload ->
      if (payload.requestCode != UPI_REQUEST_CODE) {
        return@OnActivityResult
      }

      val promise = pendingPromise ?: return@OnActivityResult
      val uri = pendingUri
      pendingPromise = null
      pendingUri = null

      val data = payload.data
      val response = readResponse(data)
      val responseMap = parseUpiResponse(response)

      Log.d(TAG, "UPI result: resultCode=${payload.resultCode}, response=$response")

      /*
       * UPI apps can return RESULT_CANCELED together with a
       * failure response, so only treat it as a user cancel
       * when there is no response at all.
       */
      val status =
        if (response.isNullOrBlank() && payload.resultCode == Activity.RESULT_CANCELED) {
          "CANCELLED"
        } else {
          determineStatus(responseMap)
        }

      promise.resolve(
        mapOf(
          "status" to status,
          "uri" to uri,
          "response" to response,
          "approvalRefNo" to responseMap["approvalrefno"],
          "txnRef" to responseMap["txnref"],
          "txnId" to responseMap["txnid"],
          "code" to responseMap["responsecode"],
          "resultCode" to payload.resultCode,
          "responseData" to data?.data?.toString()
        )
      )
    }
  }

  /*
   * Builds a personal (P2P) UPI URI in the form:
   *
   * upi://pay?pa=test@upi&pn=Test&am=1.00&cu=INR
   *
   * Only the payee UPI ID, payee name, amount and currency are sent.
   * "@" is kept as-is in pa; other special characters (e.g. spaces) are percent-encoded.
   */
  private fun buildUpiUri(options: PayOptions): String {
    if (options.pa.isBlank() || options.pn.isBlank()) {
      throw CodedException("INVALID_PAYEE", "pa (UPI ID) and pn (payee name) are required", null)
    }

    val amount = normalizeAmount(options.amount)
      ?: throw CodedException("INVALID_AMOUNT", "amount must be a positive number with at most 2 decimals, e.g. \"1.00\"", null)

    val pa = Uri.encode(options.pa.trim(), "@")
    val pn = Uri.encode(options.pn.trim())

    return "upi://pay?pa=$pa&pn=$pn&am=$amount&cu=INR"
  }

  private fun packageManager(): PackageManager? = appContext.reactContext?.packageManager

  /*
   * Returns the activities that can handle upi://pay,
   * optionally limited to a single package.
   */
  private fun queryUpiApps(packageName: String? = null): List<ResolveInfo> {
    val packageManager = packageManager() ?: return emptyList()
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("upi://pay"))

    if (packageName != null) {
      intent.setPackage(packageName)
    }

    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      packageManager.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0))
    } else {
      @Suppress("DEPRECATION")
      packageManager.queryIntentActivities(intent, 0)
    }
  }

  /*
   * UPI expects the amount with exactly 2 decimals ("1" -> "1.00").
   * Returns null if the amount is not a positive number or has more than 2 decimals.
   */
  private fun normalizeAmount(amount: String): String? {
    val value = amount.trim().toBigDecimalOrNull() ?: return null

    if (value <= BigDecimal.ZERO) {
      return null
    }

    return try {
      value.setScale(2, RoundingMode.UNNECESSARY).toPlainString()
    } catch (_: ArithmeticException) {
      null
    }
  }

  /*
   * UPI apps normally return the result in the "response" extra,
   * but some versions put the fields directly in the extras instead.
   */
  private fun readResponse(data: Intent?): String? {
    if (data == null) {
      return null
    }

    data.getStringExtra("response")?.let { return it }

    val extras = data.extras ?: return null
    val parts = extras.keySet().mapNotNull { key ->
      extras.getString(key)?.let { value -> "$key=$value" }
    }

    return parts.takeIf { it.isNotEmpty() }?.joinToString("&")
  }

  /*
   * Parse response such as:
   *
   * Status=SUCCESS&txnId=123456&responseCode=00&ApprovalRefNo=..
   *
   * Keys are lowercased because UPI apps are inconsistent
   * about casing (Status vs status, ApprovalRefNo vs approvalRefNo).
   */
  private fun parseUpiResponse(response: String?): Map<String, String> {
    if (response.isNullOrBlank()) {
      return emptyMap()
    }

    return response
      .split("&")
      .mapNotNull { item ->
        val parts = item.split("=", limit = 2)

        if (parts.size == 2) {
          parts[0].trim().lowercase() to Uri.decode(parts[1].trim())
        } else {
          null
        }
      }
      .toMap()
  }

  /*
   * Convert UPI response into our
   * library's standard status.
   */
  private fun determineStatus(response: Map<String, String>): String {
    return when (response["status"]?.uppercase()) {
      "SUCCESS" -> "SUCCESS"
      "FAILURE", "FAILED" -> "FAILURE"
      "SUBMITTED", "PENDING" -> "SUBMITTED"
      "CANCELLED" -> "CANCELLED"
      else -> "UNKNOWN"
    }
  }

  companion object {
    private const val TAG = "ReactNativeUpi"
    private const val UPI_REQUEST_CODE = 4400
  }
}
