<template>
    <div class="container">
        <h1 class="text-center mb-3">Login - TwitchRecorder</h1>
        <!-- <pre>
            {{ { error, loading, loggingin, sendVerificationCodeLoading, registerLoading } }}
        </pre> -->
        <div v-if="error != ''" class="alert alert-danger alert-dismissible">
            <!-- <button type="button" class="btn-close" data-bs-dismiss="alert" @click="error = ''"></button> -->
            <strong><span>{{ error }}</span></strong>
        </div>
        <div class="row">
            <div class="col-1"></div>
            <div class="col-5" v-auto-animate>
                <div>
                    <ul class="d-flex justify-content-around nav nav-tabs">
                        <li style="cursor:pointer" class="nav-item">
                            <a class="nav-link" :class="{
                                active: loggingin,
                            }" @click="loggingin = true">Login</a>
                        </li>
                        <li style="cursor:pointer" class="nav-item">
                            <a class="nav-link" :class="{
                                active: !loggingin,
                            }" @click="loggingin = false">Register</a>
                        </li>
                    </ul>
                </div>
                <div v-if="loggingin" class="card mt-2">
                    <div class="card-header">Login - TwitchRecorder</div>
                    <div class="card-body">
                        <h4 class="card-title">Login to the TwitchRecorder</h4>
                        <hr />
                        <div v-if="loading" class="d-flex justify-content-center">
                            <div class="spinner-border" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                        <form @submit.prevent="onLogin()" class="card-text" id="loginForm">
                            <fieldset>
                                <div class="form-group">
                                    <InputValidator v-model="form.email" v-model:valid="form.emailValid" type="text"
                                        id="email" name="Email" autocomplete="email" placeholder="Enter Email"
                                        :rules="rules.emailRules" />
                                </div>
                                <div class="form-group">
                                    <InputValidator v-model="form.password" v-model:valid="form.passwordValid"
                                        type="password" id="password" name="Password" autocomplete="current-password"
                                        placeholder="Enter Password" :rules="rules.passwordRules" />
                                </div>
                                <button type="submit" :disabled="!(form.emailValid && form.passwordValid)"
                                    class="mt-4 btn btn-primary">Login</button>
                            </fieldset>
                        </form>
                    </div>
                </div>
                <div v-if="!loggingin" class="card mt-2">
                    <div class="card-header">Register - TwitchRecorder</div>
                    <div class="card-body">
                        <h4 class="card-title">Register to the TwitchRecorder</h4>
                        <hr />
                        <div v-if="loading" class="d-flex justify-content-center">
                            <div class="spinner-border" role="status">
                                <span class="visually-hidden">Loading...</span>
                            </div>
                        </div>
                        <!-- <pre>
                            {{ form }}
                        </pre> -->
                        <form @submit.prevent="onRegister()" class="card-text" id="registerForm">
                            <fieldset v-auto-animate>
                                <div class="form-group">
                                    <InputValidator :disabled="form.codeSent" v-model="form.email"
                                        v-model:valid="form.emailValid" type="email" id="email" name="Email"
                                        autocomplete="email" placeholder="Enter Email" :rules="rules.emailRules" />
                                </div>
                                <div class="form-group">
                                    <InputValidator v-model="form.password" :disabled="form.codeSent"
                                        v-model:valid="form.passwordValid" type="password" id="password" name="Password"
                                        autocomplete="current-password" placeholder="Enter Password"
                                        :rules="rules.passwordRules" />
                                </div>
                                <div class="d-grid gap-2 mt-3">
                                    <button @click="sendVerificationCode()" type="button"
                                        :disabled="!form.emailValid || !form.passwordValid || form.codeSent"
                                        class="btn btn-primary" :class="{ 'btn-secondary': form.codeSent }">
                                        Send Code
                                    </button>
                                </div>
                                <template v-if="form.codeSent">
                                    <div class="form-group">
                                        <InputValidator v-model="form.code" v-model:valid="form.codeValid"
                                            type="verifyCode" id="code" name="Email Verify Code"
                                            autocomplete="email-verify-code" placeholder="Eneter your email verify code"
                                            :rules="rules.codeRules" />
                                    </div>
                                    <InputValidator v-model="form.passwordRepeat"
                                        v-model:valid="form.passwordRepeatValid" type="password" id="passwordrepeat"
                                        name="Password Repeat" autocomplete="again-password"
                                        placeholder="Repeat you password" :rules="rules.passwordRepeatRules" />
                                    <button type="submit"
                                        :disabled="!(form.emailValid && form.passwordValid && form.codeValid && form.passwordRepeatValid)"
                                        class="mt-4 btn btn-primary">
                                        Register
                                    </button>
                                </template>
                            </fieldset>
                        </form>
                    </div>
                </div>
            </div>
            <div class="col-1"></div>
            <div class="col-4">
                <h2 class="text-muted text-center">
                    A State of the art Twitch Recorder! <br />
                    Fully Open Source and forever Free to use!
                    <br />
                    No Adds no Restrictions! No Tracking!
                </h2>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import InputValidator from '~/components/InputValidator.vue';

const globalStore = useGlobalStore();

const loading = ref(false);
const sendVerificationCodeLoading = ref(false);
const registerLoading = ref(false);
const error = ref('');

async function sendVerificationCode() {
    error.value = '';
    sendVerificationCodeLoading.value = true;

    const { data, error: respError } = await tryCatch($fetch<any>(`http://138.201.131.52:8081/api/v1/auth/register/`, {
        ignoreResponseError: true,
        method: 'POST',
        body: {
            email: form.email,
            password: form.password,
        },
    }));

    console.log(data);


    if (respError || data.success == false) {
        error.value = data.error.message || respError?.message || 'Unknown error';
        sendVerificationCodeLoading.value = false;
        form.codeSent = false;
        return;
    }
    form.codeSent = true;

}

async function onLogin() {
    error.value = '';
    loading.value = true;
    const { data, error: respError } = await tryCatch($fetch<any>(`http://138.201.131.52:8081/api/v1/auth/login/`, {
        ignoreResponseError: true,
        method: 'POST',
        body: {
            email: form.email,
            password: form.password,
        },
    }));

    console.log(data);


    loading.value = false;
    if (respError || data.success == false) {
        error.value = data.error.message || respError?.message || 'Unknown error';
        return;
    }

    const authToken = useCookie('auth-token', { expires: new Date(Date.now() + 60 * 60 * 24 * 1000) });
    console.log('DATA', data);
    const token = data.token;
    authToken.value = token;

    globalStore.auth.token = token;
    await globalStore.authenticate();
    console.log('CAMECAMECAME');


    navigateTo('/');
}

async function onRegister() {
    error.value = '';
    registerLoading.value = true;

    const { data, error: respError } = await tryCatch($fetch<any>(`http://138.201.131.52:8081/api/v1/auth/verify/`, {
        method: 'POST',
        body: {
            email: form.email,
            verificationID: form.code,
        },
    }));

    if (respError || data.success == false) {
        error.value = data.error.message || respError?.message || 'Unknown error';
        registerLoading.value = false;
        return;
    }

    console.log('REGISTER DATA', data);

    const authToken = useCookie('auth-token', { expires: new Date(Date.now() + 60 * 60 * 24 * 1000) });

    authToken.value = data.token;

    navigateTo('/');

}

const loggingin = ref(true);

const form = reactive({
    codeSent: false,
    email: '',
    emailValid: false,
    password: '',
    passwordValid: false,
    passwordRepeat: '',
    passwordRepeatValid: false,
    code: '',
    codeValid: false,
});

function validateEmail(email: string) {
    return Boolean(email.match(
        /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    ));
}

const isNumeric = (num: any) => (typeof (num) === 'number' || typeof (num) === "string" && num.trim() !== '') && !isNaN(num as number);


const rules = reactive({
    codeRules: [
        (value: string) => !!value || 'Cannot be empty.',
        (value: string) => value.length >= 4 || 'Must be at least 4 Characters',
        (value: string) => value.length <= 10 || 'Must be below 10 Characters',
        (value: string) => isNumeric(value) || 'Must be a number Code',
    ],
    emailRules: [
        (value: string) => !!value || 'Cannot be empty.',
        (value: string) => validateEmail(value) || 'Must be a valid email!',
    ],
    passwordRules: [
        (value: string) => !!value || 'Cannot be empty.',
        (value: string) => value.length >= 8 || 'Must be at least 8 Characters and can only be 100',
    ],
    passwordRepeatRules: [
        (value: string) => !!value || 'Cannot be empty.',
        (value: string) => value.length >= 8 || 'Must be at least 8 Characters and can only be 100',
        (value: string) => value == form.password || 'Passwords do not match!',
    ],
})

</script>