<template>
    <div class="container">
        <h1 class="text-center mb-3">Login - TwitchRecorder</h1>
        <!-- <div v-if="error != '' && !(form.usernameValid && form.passwordValid)"
            class="alert alert-danger alert-dismissible">
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            <strong>Error: <span>{{ error }}</span></strong>
        </div> -->
        <div class="row">
            <div class="col-1"></div>
            <div class="col-5">
                <div class="d-flex justify-content-evenly">
                    <button type="button" :disabled="loggingin" class="btn btn-lg"
                        :class="{ 'btn-secondary': loggingin, 'btn-primary': !loggingin }" @click="loggingin = true">
                        Login
                    </button>
                    <button type="button" :disabled="!loggingin" class="btn btn-lg"
                        :class="{ 'btn-secondary': !loggingin, 'btn-primary': loggingin }" @click="loggingin = false">
                        Register
                    </button>
                </div>
                <div v-if="loggingin" class="card mt-2">
                    <div class="card-header">Login / Register - TwitchRecorder</div>
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
                        <pre>
                            {{ form }}
                        </pre>
                        <form @submit.prevent="onRegister()" class="card-text" id="registerForm">
                            <fieldset>
                                <div class="form-group">
                                    <InputValidator :disabled="form.codeSent" v-model="form.email"
                                        v-model:valid="form.emailValid" type="email" id="email" name="Email"
                                        autocomplete="email" placeholder="Enter Email" :rules="rules.emailRules" />

                                    <div class="d-grid gap-2 mt-3">
                                        <button @click="form.codeSent = true" type="button"
                                            :disabled="!form.emailValid || form.codeSent" class="btn btn-primary">
                                            Send Code
                                        </button>
                                    </div>

                                </div>
                                <div class="form-group">
                                    <InputValidator v-model="form.password" v-model:valid="form.passwordValid"
                                        type="password" id="password" name="Password" autocomplete="current-password"
                                        placeholder="Enter Password" :rules="rules.passwordRules" />
                                </div>
                                <div v-if="form.codeSent" class="form-group">
                                    <InputValidator v-model="form.code" v-model:valid="form.codeValid" type="verifyCode"
                                        id="code" name="Email Verify Code" autocomplete="email-verify-code"
                                        placeholder="Eneter your email verify code" :rules="rules.codeRules" />
                                </div>
                                <button type="submit"
                                    :disabled="!(form.emailValid && form.passwordValid && form.codeValid)"
                                    class="mt-4 btn btn-primary">
                                    Register
                                </button>
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


function onLogin() {
    console.log('Login');

}


function onRegister() {
    console.log('Register');
}

const loggingin = ref(false);
const loading = ref(false);

const form = reactive({
    codeSent: false,
    email: '',
    emailValid: false,
    password: '',
    passwordValid: false,
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
        (value: string) => value.length <= 10 || 'Must be below 10 Characters',
        (value: string) => isNumeric(value) || 'Must be a number Code',
    ],
    emailRules: [
        (value: string) => !!value || 'Cannot be empty.',
        (value: string) => validateEmail(value) || 'Must be a valid email!',
    ],
    passwordRules: [
        (value: string) => !!value || 'Cannot be empty.',
        (value: string) => value.length >= 3 || 'Must be at least 3 Characters and can only be 100',
    ],
})

</script>