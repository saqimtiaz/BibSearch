package no.uio.ub.realfagsbiblioteket;


import org.apache.cordova.*;

import no.uio.ub.realfagsbiblioteket.R;

import android.os.Bundle;
import android.app.Activity;
import android.view.Menu;

public class MainActivity extends DroidGap {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);        
        super.setIntegerProperty("splashscreen", R.drawable.splash);
        super.loadUrl("file:///android_asset/www/index.html", 3000);
    }

}

